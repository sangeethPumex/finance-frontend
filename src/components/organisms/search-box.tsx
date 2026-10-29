"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { Input } from "../atoms";

/** The search field above a paged list; the parent debounces (see usePaging). */
export function SearchBox({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <div className={cn("relative min-w-[200px] flex-1", className)}>
      <MagnifyingGlass size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <Input aria-label="Search" className="w-full pl-8" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
