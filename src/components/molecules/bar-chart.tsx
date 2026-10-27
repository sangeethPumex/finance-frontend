import { cn } from "@/lib/cn";

export type Bar = { key: string; value: number; title?: string };

/** Minimal vertical bars scaled to the largest value; the title shows on hover. */
export function BarChart({ bars, label, height = 112, className }: { bars: Bar[]; label: string; height?: number; className?: string }) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className={cn("flex items-end gap-[3px]", className)} style={{ height }} role="img" aria-label={label}>
      {bars.map((b) => (
        <div key={b.key} title={b.title} className="flex-1 rounded-sm bg-line transition-colors hover:bg-ink" style={{ height: `${Math.max((b.value / max) * 100, 2)}%` }} />
      ))}
    </div>
  );
}
