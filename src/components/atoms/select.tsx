"use client";

import { Children, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { fieldClass, type FieldSize, type FieldVariant } from "./field";

export type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  size?: FieldSize;
  variant?: FieldVariant;
  invalid?: boolean;
};

type Opt = { value: string; label: string; disabled?: boolean; group?: string };

const text = (n: ReactNode): string => (typeof n === "string" || typeof n === "number" ? String(n) : Array.isArray(n) ? n.map(text).join("") : isValidElement(n) ? text((n.props as { children?: ReactNode }).children) : "");

/** Reads <option> and <optgroup> children, so every caller keeps writing a plain select. */
function collect(children: ReactNode, group?: string, out: Opt[] = []): Opt[] {
  Children.forEach(children, (c) => {
    if (!isValidElement(c)) return;
    const el = c as ReactElement<{ value?: string | number; label?: string; disabled?: boolean; children?: ReactNode }>;
    if (el.type === "optgroup") collect(el.props.children, el.props.label, out);
    else if (el.type === "option") out.push({ value: String(el.props.value ?? text(el.props.children)), label: text(el.props.children), disabled: el.props.disabled, group });
    else collect(el.props.children, group, out);
  });
  return out;
}

/**
 * A dropdown in the app's own style. It takes the same props and <option> children as a native select and calls onChange with
 * { target: { value, name } }, so callers did not change. A hidden input carries the value into forms, and form.reset() restores the default.
 */
export function Select({ size, variant, invalid, className, children, value, defaultValue, onChange, name, required, disabled, id, ...p }: SelectProps) {
  const opts = collect(children);
  const [inner, setInner] = useState(String(defaultValue ?? ""));
  const current = value !== undefined ? String(value) : inner;
  const sel = opts.find((o) => o.value === current);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [box, setBox] = useState<{ left: number; width: number; top?: number; bottom?: number; max: number }>();
  const btn = useRef<HTMLButtonElement>(null), list = useRef<HTMLUListElement>(null), field = useRef<HTMLInputElement>(null);
  const uid = useId();

  // form.reset() puts an uncontrolled select back to its default
  useEffect(() => {
    const f = field.current?.form;
    if (!f || value !== undefined) return;
    const reset = () => setInner(String(defaultValue ?? ""));
    f.addEventListener("reset", reset);
    return () => f.removeEventListener("reset", reset);
  }, [value, defaultValue]);

  const place = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom, above = r.top, want = Math.min(opts.length * 36 + 12, 280);
    const down = below >= want || below >= above;
    setBox({ left: r.left, width: Math.max(r.width, 160), max: Math.max(Math.min(want, (down ? below : above) - 12), 120), ...(down ? { top: r.bottom + 4 } : { bottom: window.innerHeight - r.top + 4 }) });
  };
  useLayoutEffect(() => { if (open) place(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => { if (!btn.current?.contains(e.target as Node) && !list.current?.contains(e.target as Node)) setOpen(false); };
    const close = (e: Event) => { if (!list.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => { document.removeEventListener("pointerdown", away); window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); };
  }, [open]);
  useEffect(() => { if (open) list.current?.querySelector(`[data-i="${hi}"]`)?.scrollIntoView({ block: "nearest" }); }, [hi, open, box]);

  const pick = (o: Opt) => {
    if (o.disabled) return;
    if (value === undefined) setInner(o.value);
    onChange?.({ target: { value: o.value, name: name ?? "" }, currentTarget: { value: o.value, name: name ?? "" } } as unknown as React.ChangeEvent<HTMLSelectElement>);
    setOpen(false);
    btn.current?.focus();
  };
  const openList = () => { setHi(Math.max(opts.findIndex((o) => o.value === current), 0)); setOpen(true); };
  const move = (d: number) => { let i = hi; do { i = (i + d + opts.length) % opts.length; } while (opts[i]?.disabled && i !== hi); setHi(i); };

  const onKey = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); return; } // keeps a surrounding dialog open
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (open) move(e.key === "ArrowDown" ? 1 : -1); else openList(); }
    else if ((e.key === "Enter" || e.key === " ") && open) { e.preventDefault(); if (opts[hi]) pick(opts[hi]); }
    else if (e.key === "Tab") setOpen(false);
    else if (e.key.length === 1 && /\S/.test(e.key)) { // type a letter to jump
      const i = opts.findIndex((o, n) => n > (open ? hi : -1) && o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      const j = i >= 0 ? i : opts.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      if (j >= 0) { if (open) setHi(j); else pick(opts[j]); }
    }
  };

  let lastGroup: string | undefined;
  return (
    <div className="relative min-w-0">
      <button ref={btn} type="button" id={id} disabled={disabled} role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${uid}-list`}
        aria-label={p["aria-label"]} aria-invalid={invalid || undefined} aria-describedby={p["aria-describedby"]} title={p.title}
        onClick={() => (open ? setOpen(false) : openList())} onKeyDown={onKey}
        className={cn(fieldClass(size, variant, invalid), "flex w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60", className)}>
        {/* the longest option sets the width, so the control does not resize as the choice changes */}
        <span className="grid min-w-0 flex-1">
          <span className={cn("col-start-1 row-start-1 truncate", !sel?.value && "text-muted")}>{sel?.label || "Select…"}</span>
          <span aria-hidden className="invisible col-start-1 row-start-1 h-0 overflow-hidden whitespace-nowrap">{opts.reduce((m, o) => (o.label.length > m.length ? o.label : m), "Select…")}</span>
        </span>
        <CaretDown size={12} weight="bold" className={cn("shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {/* carries the value into a form; required shows the browser's own prompt over the field */}
      <input ref={field} name={name} value={current} required={required} onChange={() => {}} tabIndex={-1} aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-0" />
      {open && box && createPortal(
        <ul ref={list} id={`${uid}-list`} role="listbox" style={{ position: "fixed", left: box.left, width: box.width, top: box.top, bottom: box.bottom, maxHeight: box.max }}
          className="z-[70] overflow-y-auto rounded-md border border-line bg-surface py-1 shadow-[0_8px_24px_rgba(0,0,0,.12)]">
          {opts.map((o, i) => {
            const head = o.group && o.group !== lastGroup ? o.group : null;
            lastGroup = o.group;
            return (
              <li key={`${o.value}-${i}`} role="presentation">
                {head && <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">{head}</div>}
                <div role="option" aria-selected={o.value === current} aria-disabled={o.disabled} data-i={i}
                  onMouseEnter={() => setHi(i)} onClick={() => pick(o)}
                  className={cn("flex min-h-9 cursor-pointer items-center justify-between gap-3 px-3 text-[13px]", i === hi && "bg-hover", o.disabled && "cursor-not-allowed opacity-50", o.value === current && "font-semibold")}>
                  <span className={cn("truncate", !o.value && "text-muted")}>{o.label}</span>
                  {o.value === current && <Check size={13} weight="bold" className="shrink-0" />}
                </div>
              </li>
            );
          })}
        </ul>, document.body)}
    </div>
  );
}
