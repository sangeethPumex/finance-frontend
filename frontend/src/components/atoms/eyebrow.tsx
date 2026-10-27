import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

/** Small uppercase label for card titles and stat captions. */
export function Eyebrow({ as: Tag = "span", icon: Icon, className, children }: { as?: "span" | "h2" | "h3" | "p"; icon?: Icon; className?: string; children: React.ReactNode }) {
  return (
    <Tag className={cn("eyebrow inline-flex items-center gap-2", className)}>
      {Icon && <Icon size={14} />}
      {children}
    </Tag>
  );
}
