import { cn } from "@/lib/cn";

/** accent: short black rule under titles. line / soft: full-width separators. */
export type DividerVariant = "accent" | "line" | "soft";

const variants: Record<DividerVariant, string> = {
  accent: "w-10 bg-ink",
  line: "w-full bg-line",
  soft: "w-full bg-line-soft",
};

export function Divider({ variant = "line", className }: { variant?: DividerVariant; className?: string }) {
  return <div role="separator" className={cn("h-px", variants[variant], className)} />;
}
