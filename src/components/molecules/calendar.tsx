"use client";

import { useEffect, useRef, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { addDays, addMonths, isoDay, parseDay } from "@/lib/dates";
import { Select } from "../atoms";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; // Monday first, like the weekday bars
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const long = (iso: string) => parseDay(iso)!.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const monday = (iso: string) => (parseDay(iso)!.getDay() + 6) % 7; // 0 = Monday

export type CalendarProps = {
  /** The chosen day, YYYY-MM-DD. */
  value?: string;
  onSelect: (day: string) => void;
  /** Days outside min..max (YYYY-MM-DD) cannot be chosen. */
  min?: string;
  max?: string;
  /** Moves keyboard focus onto the chosen day when it appears, for a calendar that opens on demand. */
  autoFocus?: boolean;
};

/**
 * A month grid in the app's style. Arrow keys move by a day or a week, Home and End to the week's ends, Page Up and Page Down by a month
 * (with Shift, a year). The month and year are pick lists, so a date years back is two taps away.
 */
export function Calendar({ value, onSelect, min, max, autoFocus }: CalendarProps) {
  const today = isoDay(new Date());
  const clamp = (d: string) => (min && d < min ? min : max && d > max ? max : d);
  // The one day that takes the Tab key; the month shown is always the month of this day.
  const [focus, setFocus] = useState(() => clamp(value || today));
  const refocus = useRef(autoFocus ?? false);
  const grid = useRef<HTMLTableElement>(null);
  // After every render, so a day clicked in the next month (which redraws the grid) keeps focus: without it Escape would reach the page.
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`)?.focus();
  });

  const f = parseDay(focus)!, y = f.getFullYear(), m = f.getMonth();
  const jump = (year: number, month: number) => setFocus(clamp(isoDay(new Date(year, month, Math.min(f.getDate(), new Date(year, month + 1, 0).getDate())))));
  const first = isoDay(new Date(y, m, 1)), start = addDays(first, -monday(first));
  const ym = focus.slice(0, 7);
  const years = Array.from({ length: (max ? +max.slice(0, 4) : new Date().getFullYear() + 10) - (min ? +min.slice(0, 4) : new Date().getFullYear() - 30) + 1 }, (_, i) => (min ? +min.slice(0, 4) : new Date().getFullYear() - 30) + i);

  const onKey = (e: React.KeyboardEvent) => {
    const step: Record<string, string> = {
      ArrowLeft: addDays(focus, -1), ArrowRight: addDays(focus, 1), ArrowUp: addDays(focus, -7), ArrowDown: addDays(focus, 7),
      PageUp: addMonths(focus, e.shiftKey ? -12 : -1), PageDown: addMonths(focus, e.shiftKey ? 12 : 1),
      Home: addDays(focus, -monday(focus)), End: addDays(focus, 6 - monday(focus)),
    };
    if (!(e.key in step)) return;
    e.preventDefault();
    refocus.current = true;
    setFocus(clamp(step[e.key]));
  };

  const nav = "grid size-9 place-items-center border border-line bg-surface text-muted transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-40 md:size-8";
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <button type="button" aria-label="Previous month" disabled={!!min && ym <= min.slice(0, 7)} onClick={() => jump(y, m - 1)} className={nav}><CaretLeft size={14} /></button>
        <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto] gap-1.5">
          <Select size="sm" aria-label="Month" value={String(m)} onChange={(e) => jump(y, +e.target.value)}>{MONTHS.map((n, i) => <option key={n} value={i}>{n.slice(0, 3)}</option>)}</Select>
          <Select size="sm" aria-label="Year" value={String(y)} onChange={(e) => jump(+e.target.value, m)}>{(years.includes(y) ? years : [...years, y].sort()).map((n) => <option key={n} value={n}>{n}</option>)}</Select>
        </div>
        <button type="button" aria-label="Next month" disabled={!!max && ym >= max.slice(0, 7)} onClick={() => jump(y, m + 1)} className={nav}><CaretRight size={14} /></button>
      </div>
      <table ref={grid} role="grid" aria-label={`${MONTHS[m]} ${y}`} onKeyDown={onKey} className="w-full border-collapse text-center text-[13px]">
        <thead>
          <tr>{WEEKDAYS.map((d) => <th key={d} scope="col" className="pb-1 text-[11px] font-medium text-muted"><abbr title={d} className="no-underline">{d.slice(0, 2)}</abbr></th>)}</tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }, (_, w) => (
            <tr key={w}>
              {Array.from({ length: 7 }, (_, i) => {
                const day = addDays(start, w * 7 + i), off = (!!min && day < min) || (!!max && day > max), picked = day === value;
                return (
                  <td key={day} className="p-px">
                    <button type="button" data-day={day} disabled={off} tabIndex={day === focus ? 0 : -1} aria-label={long(day)} aria-pressed={picked} aria-current={day === today ? "date" : undefined}
                      onClick={() => { refocus.current = true; setFocus(day); onSelect(day); }}
                      className={cn("num grid size-9 w-full place-items-center rounded-md outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-black/10 md:size-8",
                        picked ? "bg-ink font-semibold text-white" : day.slice(0, 7) === ym ? "text-ink hover:bg-tint" : "text-faint hover:bg-tint",
                        day === today && !picked && "border border-strong font-semibold", off && "pointer-events-none opacity-30")}>
                      {+day.slice(8)}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" disabled={(!!min && today < min) || (!!max && today > max)} onClick={() => { setFocus(today); onSelect(today); }}
        className="mt-2 text-[12px] font-medium text-sub underline underline-offset-2 hover:text-ink disabled:pointer-events-none disabled:opacity-40">Today</button>
    </div>
  );
}
