import { cn } from "@/lib/cn";

export type BadgeVariant = "neutral" | "outline" | "solid" | "good" | "bad" | "warn" | "info";

const variants: Record<BadgeVariant, string> = {
  neutral: "bg-tint text-sub",
  outline: "border border-line text-muted",
  solid: "bg-ink text-white",
  good: "bg-gain-bg text-gain",
  bad: "bg-loss-bg text-loss",
  warn: "bg-warn-bg text-warn",
  info: "bg-info-bg text-info",
};

export function Badge({ variant = "neutral", className, ...p }: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return <span {...p} className={cn("inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-medium", variants[variant], className)} />;
}
