"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CaretRight, MagnifyingGlass, SidebarSimple } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import type { NavGroup } from "@/lib/nav";

/** Top bar: sidebar toggle, breadcrumb of where you are, and a jump-to-page search (press / or Ctrl+K). */
export function AppHeader({ groups, collapsed, onToggle }: { groups: NavGroup[]; collapsed: boolean; onToggle: () => void }) {
  const path = usePathname(), router = useRouter();
  const [q, setQ] = useState(""), [open, setOpen] = useState(false), [at, setAt] = useState(0);
  const box = useRef<HTMLInputElement>(null);

  const all = groups.flatMap((g) => g.links.map((l) => ({ ...l, group: g.title })));
  const here = all.filter((l) => (l.href === "/" ? path === "/" : path.startsWith(l.href))).sort((a, b) => b.href.length - a.href.length)[0];
  const hits = q.trim() ? all.filter((l) => `${l.label} ${l.group}`.toLowerCase().includes(q.trim().toLowerCase())) : all;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName);
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) { e.preventDefault(); box.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => { router.push(href); setQ(""); setOpen(false); box.current?.blur(); };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur md:px-10">
      <button type="button" onClick={onToggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="hidden size-8 place-items-center border border-line bg-surface text-muted transition-colors hover:text-ink md:grid">
        <SidebarSimple size={16} />
      </button>

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
        <Link href="/" className="hidden text-faint hover:text-sub sm:inline">Catalyst</Link>
        {here && (
          <>
            <CaretRight size={11} className="hidden shrink-0 text-faint sm:block" />
            {here.href !== "/" && <><span className="hidden text-faint sm:inline">{here.group}</span><CaretRight size={11} className="hidden shrink-0 text-faint sm:block" /></>}
            <span className="truncate font-medium text-ink">{here.label}</span>
          </>
        )}
      </nav>

      <div className="relative ml-auto w-full max-w-[280px]">
        <MagnifyingGlass size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          ref={box}
          aria-label="Jump to page"
          placeholder="Jump to…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setAt(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setAt((a) => Math.min(a + 1, hits.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setAt((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Enter" && hits[at]) go(hits[at].href);
            else if (e.key === "Escape") { setOpen(false); box.current?.blur(); }
          }}
          className="h-9 w-full border border-line bg-surface pl-8 pr-12 text-[13px] text-ink outline-none transition-colors hover:border-strong focus:border-ink"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 border border-line bg-tint px-1.5 font-mono text-[10px] text-muted md:block">Ctrl K</kbd>
        {open && hits.length > 0 && (
          <ul role="listbox" className="absolute right-0 top-full z-40 mt-1 max-h-72 w-full min-w-[240px] overflow-y-auto border border-line bg-surface py-1 shadow-lg">
            {hits.map((l, i) => (
              <li key={l.href} role="option" aria-selected={i === at}>
                <button type="button" onMouseDown={() => go(l.href)} onMouseEnter={() => setAt(i)} className={cn("flex h-9 w-full items-center gap-2.5 px-3 text-left text-[13px] text-sub", i === at && "bg-tint text-ink")}>
                  <l.icon size={16} className="text-muted" />
                  <span className="flex-1 truncate">{l.label}</span>
                  <span className="text-[11px] text-faint">{l.group}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </header>
  );
}
