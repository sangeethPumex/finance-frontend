import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

/** Sidebar entry. A link when given href, otherwise a button (e.g. Sign Out). */
export function NavItem({ label, icon: Icon, href, onClick, active, collapsed, ai }: { label: string; icon: Icon; href?: string; onClick?: () => void; active?: boolean; collapsed?: boolean; ai?: boolean }) {
  const className = cn(
    "group flex h-10 w-full items-center gap-3 whitespace-nowrap rounded-md px-3 text-sm transition-colors",
    active ? "border border-line bg-surface font-medium text-ink shadow-[0_1px_2px_rgba(28,28,27,.06)]" : "border border-transparent text-muted hover:bg-black/[0.04] hover:text-sub",
    collapsed && "md:justify-center md:px-0",
  );
  const body = (
    <>
      <Icon size={18} weight={active ? "fill" : "light"} className={ai ? "text-orange-500" : active ? "" : "opacity-70 group-hover:opacity-100"} />
      <span className={cn(collapsed && "md:hidden", ai && "bg-gradient-to-r from-orange-500 to-black bg-clip-text font-medium text-transparent")}>{label}</span>
    </>
  );
  return href ? (
    <Link href={href} title={label} aria-current={active ? "page" : undefined} className={className}>{body}</Link>
  ) : (
    <button type="button" title={label} onClick={onClick} className={className}>{body}</button>
  );
}
