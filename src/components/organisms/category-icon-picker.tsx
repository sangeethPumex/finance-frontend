"use client";

import { useState } from "react";
import { MagnifyingGlass, Prohibit } from "@phosphor-icons/react";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { cn } from "@/lib/cn";
import { Input } from "../atoms";
import { Modal } from "../molecules";

/** Pick an icon for a category from the built-in set. Choosing one saves it straight away; "No icon" removes it. */
export function CategoryIconPicker({ name, current, onPick, onClose }: { name: string; current?: string; onPick: (key: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = Object.entries(CATEGORY_ICONS).filter(([k, v]) => !needle || v.label.toLowerCase().includes(needle) || k.toLowerCase().includes(needle));
  return (
    <Modal title="Choose an icon" subtitle={name} onClose={onClose}>
      <div className="relative mb-4">
        <MagnifyingGlass size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <Input aria-label="Search icons" className="w-full pl-8" placeholder="Search icons, such as fuel or food" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5" role="listbox" aria-label="Icons">
        <button type="button" role="option" aria-selected={!current} onClick={() => onPick("")}
          className={cn("flex h-[72px] flex-col items-center justify-center gap-1 border text-[11px] text-muted transition-colors hover:bg-hover", !current ? "border-ink bg-tint text-ink" : "border-line")}>
          <Prohibit size={20} />No icon
        </button>
        {shown.map(([key, { icon: Icon, label }]) => (
          <button key={key} type="button" role="option" aria-selected={current === key} onClick={() => onPick(key)}
            className={cn("flex h-[72px] flex-col items-center justify-center gap-1 border px-1 text-[11px] transition-colors hover:bg-hover", current === key ? "border-ink bg-tint font-semibold" : "border-line text-sub")}>
            <Icon size={22} weight={current === key ? "fill" : "regular"} /><span className="w-full truncate text-center">{label}</span>
          </button>
        ))}
      </div>
      {shown.length === 0 && <p className="py-6 text-center text-[13px] text-muted">No icon matches &ldquo;{q}&rdquo;.</p>}
    </Modal>
  );
}
