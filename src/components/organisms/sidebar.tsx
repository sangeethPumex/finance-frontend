"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarSimple, SignOut } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import type { NavLink } from "@/lib/nav";
import { Divider } from "../atoms";
import { NavItem } from "../molecules";

const STORAGE_KEY = "catalyst.nav";

export type SidebarProps = {
  groups: NavLink[][];
  /** Shows a Sign Out entry at the bottom when given. */
  onSignOut?: () => void;
};

/** Full-height navigation. Collapses to an icon rail on md+; the choice is remembered. */
export function Sidebar({ groups, onSignOut }: SidebarProps) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  // Restore after mount so server and client render the same first frame.
  useEffect(() => {
    try { setCollapsed(localStorage.getItem(STORAGE_KEY) === "1"); } catch { /* storage blocked */ }
  }, []);
  const toggle = () => {
    setCollapsed(!collapsed);
    try { localStorage.setItem(STORAGE_KEY, collapsed ? "0" : "1"); } catch { /* storage blocked */ }
  };

  return (
    <aside className={cn("hidden shrink-0 flex-col border-line bg-white md:sticky md:top-0 md:flex md:h-dvh md:border-r", collapsed ? "md:w-16" : "md:w-[208px]")}>
      <div className={cn("flex h-14 items-center border-b border-line px-4", collapsed ? "md:justify-center" : "justify-between")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={collapsed ? "/catalyst-short.svg" : "/catalyst-full.svg"} alt="Catalyst" className="h-7 w-auto" />
        <button type="button" onClick={toggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="hidden size-8 place-items-center rounded-md text-muted hover:bg-tint hover:text-ink md:grid">
          <SidebarSimple size={18} />
        </button>
      </div>

      <nav className="flex gap-1 overflow-x-auto p-3 md:flex-1 md:flex-col md:overflow-visible">
        {groups.map((group, g) => (
          <div key={g} className={cn("flex gap-1 md:flex-col", g > 0 && "md:mt-2 md:border-t md:border-line-soft md:pt-3")}>
            {group.map((l) => (
              <NavItem key={l.href} {...l} active={l.href === "/" ? path === "/" : path.startsWith(l.href)} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>

      {onSignOut && (
        <div className="hidden p-3 md:block">
          <Divider variant="soft" className="mb-3" />
          <NavItem label="Sign Out" icon={SignOut} onClick={onSignOut} collapsed={collapsed} />
        </div>
      )}
    </aside>
  );
}
