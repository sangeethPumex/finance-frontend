"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CaretDown, SignOut } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import type { NavGroup } from "@/lib/nav";
import { NavItem } from "../molecules";

const GROUPS_KEY = "catalyst.nav.closed";

export type SidebarProps = {
  groups: NavGroup[];
  /** Icon rail instead of the full menu (md and up). */
  collapsed: boolean;
  /** Shows a Sign Out entry at the bottom when given. */
  onSignOut?: () => void;
};

/** Full-height navigation on a tinted rail: brand card, grouped links, account card. Collapse state lives in the shell, the toggle in the header. */
export function Sidebar({ groups, collapsed, onSignOut }: SidebarProps) {
  const path = usePathname();
  const [closed, setClosed] = useState<string[]>([]); // titles of groups folded shut
  // Restore after mount so server and client render the same first frame.
  useEffect(() => {
    try { setClosed(JSON.parse(localStorage.getItem(GROUPS_KEY) ?? "[]")); } catch { /* storage blocked */ }
  }, []);

  const fold = (title: string) => {
    const next = closed.includes(title) ? closed.filter((t) => t !== title) : [...closed, title];
    setClosed(next);
    try { localStorage.setItem(GROUPS_KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
  };

  return (
    <aside className={cn("hidden shrink-0 flex-col border-line bg-sidebar md:sticky md:top-0 md:flex md:h-dvh md:border-r", collapsed ? "md:w-[72px]" : "md:w-[240px]")}>
      <div className="p-3">
        <div className={cn("flex h-14 items-center gap-3 border border-line bg-surface px-3", collapsed && "justify-center px-0")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={collapsed ? "/catalyst-short.svg" : "/catalyst-full.svg"} alt="Catalyst" className="h-7 w-auto" />
        </div>
      </div>

      <nav className="slim-scroll flex gap-1 overflow-x-auto px-3 pb-3 md:min-h-0 md:flex-1 md:flex-col md:overflow-y-auto">
        {groups.map((group, g) => {
          const shut = !collapsed && closed.includes(group.title); // the icon rail always shows every icon
          return (
            <div key={group.title} className={cn("flex gap-1 md:flex-col", g > 0 && "md:mt-3")}>
              {!collapsed && (
                <button type="button" onClick={() => fold(group.title)} aria-expanded={!shut} className="eyebrow hidden items-center justify-between px-3 pb-1 text-[10px] text-faint hover:text-sub md:flex">
                  {group.title}<CaretDown size={11} className={cn("transition-transform", shut && "-rotate-90")} />
                </button>
              )}
              {collapsed && g > 0 && <div role="separator" className="mx-3 hidden h-px bg-line md:block" />}
              {!shut && group.links.map((l) => (
                <NavItem key={l.href} {...l} active={l.href === "/" ? path === "/" : path.startsWith(l.href)} collapsed={collapsed} />
              ))}
            </div>
          );
        })}
      </nav>

      {onSignOut && (
        <div className="hidden border-t border-line p-3 md:block">
          <button type="button" onClick={onSignOut} title="Sign out" className={cn("flex h-12 w-full items-center gap-3 border border-line bg-surface px-3 text-left transition-colors hover:border-strong", collapsed && "justify-center px-0")}>
            <span className="grid size-8 shrink-0 place-items-center bg-ink text-[13px] font-semibold text-white">C</span>
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-[13px] font-medium text-ink">My finances</span>
                  <span className="block truncate text-[11px] text-muted">Sign out</span>
                </span>
                <SignOut size={16} className="shrink-0 text-muted" />
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
