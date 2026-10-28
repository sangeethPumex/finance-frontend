"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DotsThreeCircle, SignOut } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import type { NavGroup } from "@/lib/nav";
import { Modal } from "../molecules";

const PRIMARY = ["/", "/accounts", "/emis", "/transactions"];

/** iPhone-style bottom tab bar: four main pages and a More sheet for the rest. Hidden from md up, where the sidebar takes over. */
export function MobileNav({ groups, onSignOut }: { groups: NavGroup[]; onSignOut: () => void }) {
  const path = usePathname();
  const [more, setMore] = useState(false);
  const all = groups.flatMap((g) => g.links), main = PRIMARY.map((h) => all.find((l) => l.href === h)!), rest = all.filter((l) => !PRIMARY.includes(l.href));
  const on = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  const tab = "flex flex-col items-center gap-0.5 pt-2 text-[10px]";

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Main">
        <div className="grid grid-cols-5">
          {main.map((l) => (
            <Link key={l.href} href={l.href} aria-current={on(l.href) ? "page" : undefined} className={cn(tab, "pb-2", on(l.href) ? "font-semibold text-ink" : "text-muted")}>
              <l.icon size={22} weight={on(l.href) ? "fill" : "light"} />{l.label.split(" ")[0]}
            </Link>
          ))}
          <button type="button" onClick={() => setMore(true)} className={cn(tab, "pb-2", rest.some((l) => on(l.href)) ? "font-semibold text-ink" : "text-muted")}>
            <DotsThreeCircle size={22} weight={rest.some((l) => on(l.href)) ? "fill" : "light"} />More
          </button>
        </div>
      </nav>
      {more && (
        <Modal title="More" onClose={() => setMore(false)}>
          <div className="-my-2 divide-y divide-line-soft">
            {rest.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMore(false)} className={cn("flex h-12 items-center gap-3 text-[15px]", on(l.href) ? "font-semibold" : "text-sub")}><l.icon size={20} weight="light" />{l.label}</Link>
            ))}
            <button type="button" onClick={onSignOut} className="flex h-12 w-full items-center gap-3 text-[15px] text-loss"><SignOut size={20} weight="light" />Sign out</button>
          </div>
        </Modal>
      )}
    </>
  );
}
