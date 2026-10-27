import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

/** Sidebar entry. A link when given href, otherwise a button (e.g. Sign Out). */
export function NavItem({ label, icon: Icon, href, onClick, active, collapsed }: { label: string; icon: Icon; href?: string; onClick?: () => void; active?: boolean; collapsed?: boolean }) {
  const className = cn(
    "group flex h-10 w-full items-center gap-3 whitespace-nowrap rounded-md px-3 text-sm transition-colors",
    active ? "bg-ink font-medium text-white" : "text-muted hover:bg-hover hover:text-sub",
    collapsed && "md:justify-center md:px-0",
  );
  const body = (
    <>
      <Icon size={18} weight={active ? "fill" : "light"} className={active ? "" : "opacity-70 group-hover:opacity-100"} />
      <span className={cn(collapsed && "md:hidden")}>{label}</span>
    </>
  );
  return href ? (
    <Link href={href} title={label} aria-current={active ? "page" : undefined} className={className}>{body}</Link>
  ) : (
    <button type="button" title={label} onClick={onClick} className={className}>{body}</button>
  );
}
