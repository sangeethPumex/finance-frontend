"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarBlank } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { isoDay, parseDay } from "@/lib/dates";
import { Button, Select } from "../atoms";
import { fieldClass, type FieldSize } from "../atoms/field";
import { Calendar } from "./calendar";

const pad = (n: number) => String(n).padStart(2, "0");
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const clock = (hm: string) => { const [h, m] = hm.split(":").map(Number); return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? "pm" : "am"}`; };
const WIDTH = 288;

export type DatePickerProps = {
  /** YYYY-MM-DD, or YYYY-MM-DDTHH:mm with time. Empty when nothing is chosen. Leave out value to let the field keep it (with defaultValue). */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Carries the value into a form that reads FormData; form.reset() restores defaultValue. */
  name?: string;
  /** Also asks for a time of day. */
  time?: boolean;
  /** Same format as value. With time, the time of day counts too. */
  min?: string;
  max?: string;
  size?: FieldSize;
  invalid?: boolean;
  /** Shows a Clear button, for a date that may be left empty. */
  clearable?: boolean;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
};

/**
 * A date field in the app's style, in place of the browser's own. A tap opens the Calendar in a popover that stays inside the screen and
 * flips above the field when there is no room below. Used in a form like any other field: it is controlled by value and onChange.
 */
export function DatePicker({ value: controlled, defaultValue, onChange: notify, name, time, min, max, size, invalid, clearable, placeholder, disabled, id, className, ...aria }: DatePickerProps) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const value = controlled ?? inner;
  const onChange = (v: string) => { if (controlled === undefined) setInner(v); notify?.(v); };
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const f = field.current?.form;
    if (!f || controlled !== undefined) return;
    const reset = () => setInner(defaultValue ?? "");
    f.addEventListener("reset", reset);
    return () => f.removeEventListener("reset", reset);
  }, [controlled, defaultValue]);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ left: number; max: number; top?: number; bottom?: number }>();
  const btn = useRef<HTMLButtonElement>(null), pop = useRef<HTMLDivElement>(null);
  const uid = useId();
  const day = value.slice(0, 10), hm = value.slice(11, 16);
  const when = parseDay(day);

  const place = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    // Below the field when it fits, else on the roomier side; the popover scrolls inside itself when neither side has enough room.
    const below = window.innerHeight - r.bottom, above = r.top, want = time ? 430 : 350, down = below >= want || below >= above;
    setBox({ left: Math.max(8, Math.min(r.left, window.innerWidth - WIDTH - 8)), max: Math.max((down ? below : above) - 12, 200), ...(down ? { top: r.bottom + 4 } : { bottom: window.innerHeight - r.top + 4 }) });
  };
  useLayoutEffect(() => { if (open) place(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    // A pick list opened from inside the popover lives outside it in the page, so it counts as inside.
    const inside = (n: Element | null) => !!n?.closest?.('[role="listbox"]') || !!pop.current?.contains(n);
    const away = (e: Event) => { if (!btn.current?.contains(e.target as Node) && !inside(e.target as Element)) setOpen(false); };
    const follow = (e: Event) => { if (!inside(e.target as Element)) place(); };
    document.addEventListener("pointerdown", away);
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", place);
    return () => { document.removeEventListener("pointerdown", away); window.removeEventListener("scroll", follow, true); window.removeEventListener("resize", place); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => { setOpen(false); btn.current?.focus(); };
  /** Builds the value, held inside min and max. */
  const emit = (d: string, t: string) => {
    let v = time ? `${d}T${t}` : d;
    if (max && v > max) v = max;
    if (min && v < min) v = min;
    onChange(v);
  };
  const pick = (d: string) => { emit(d, hm || nowHM()); if (!time) close(); };

  const [h, mi] = (hm || "00:00").split(":").map(Number), pm = h >= 12;
  const setTime = (h12: number, m: number, isPm: boolean) => emit(day || isoDay(new Date()), `${pad((h12 % 12) + (isPm ? 12 : 0))}:${pad(m)}`);

  const text = when && (when.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) + (time && hm ? `, ${clock(hm)}` : ""));
  return (
    <div className="relative min-w-0">
      <button ref={btn} type="button" id={id} disabled={disabled} aria-haspopup="dialog" aria-expanded={open} aria-controls={`${uid}-pop`}
        aria-label={aria["aria-label"] ? `${aria["aria-label"]}${text ? `: ${text}` : ""}` : undefined}
        onClick={() => setOpen((o) => !o)} onKeyDown={(e) => { if (e.key === "ArrowDown" && !open) { e.preventDefault(); setOpen(true); } }}
        className={cn(fieldClass(size, "outline", invalid), "flex w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60", className)}>
        <span className={cn("truncate", !text && "text-muted")}>{text || placeholder || (time ? "Pick date and time" : "Pick a date")}</span>
        <CalendarBlank size={15} className="shrink-0 text-muted" />
      </button>
      {name && <input ref={field} type="hidden" name={name} value={value} />}
      {open && box && createPortal(
        <div ref={pop} id={`${uid}-pop`} role="dialog" aria-label={time ? "Choose date and time" : "Choose date"}
          onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } }} // keeps a surrounding dialog open
          style={{ position: "fixed", left: box.left, top: box.top, bottom: box.bottom, width: WIDTH, maxHeight: box.max }}
          className="z-[70] overflow-y-auto rounded-md border border-line bg-surface p-3 shadow-[0_8px_24px_rgba(0,0,0,.12)]">
          <Calendar autoFocus value={day || undefined} min={min?.slice(0, 10)} max={max?.slice(0, 10)} onSelect={pick} />
          {time && (
            <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-3">
              <Select size="sm" aria-label="Hour" value={String(h % 12 || 12)} onChange={(e) => setTime(+e.target.value, mi, pm)}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</Select>
              <span aria-hidden className="text-muted">:</span>
              <Select size="sm" aria-label="Minute" value={String(mi)} onChange={(e) => setTime(h % 12 || 12, +e.target.value, pm)}>{Array.from({ length: 60 }, (_, i) => <option key={i} value={i}>{pad(i)}</option>)}</Select>
              <Select size="sm" aria-label="AM or PM" value={pm ? "pm" : "am"} onChange={(e) => setTime(h % 12 || 12, mi, e.target.value === "pm")}><option value="am">am</option><option value="pm">pm</option></Select>
            </div>
          )}
          {(time || (clearable && value)) && (
            <div className="mt-3 flex items-center justify-between gap-2">
              {clearable && value ? <Button size="sm" variant="quiet" onClick={() => { onChange(""); close(); }}>Clear</Button> : <span />}
              {time && <Button size="sm" onClick={close}>Done</Button>}
            </div>
          )}
        </div>, document.body)}
    </div>
  );
}
