import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

export type IconTileSize = "sm" | "md" | "lg";
export type IconTileVariant = "outline" | "solid";

const sizes: Record<IconTileSize, { box: string; px: number }> = {
  sm: { box: "size-8", px: 16 },
  md: { box: "size-10", px: 20 },
  lg: { box: "size-12", px: 24 },
};

/** A square holding one icon. */
export function IconTile({ icon: Icon, size = "md", variant = "outline", className }: { icon: Icon; size?: IconTileSize; variant?: IconTileVariant; className?: string }) {
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-md", sizes[size].box, variant === "solid" ? "bg-ink text-white" : "border border-line", className)}>
      <Icon size={sizes[size].px} />
    </span>
  );
}
