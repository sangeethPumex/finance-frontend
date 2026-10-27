import { cn } from "@/lib/cn";

export const toneText = { good: "text-gain", bad: "text-loss", warn: "text-warn", info: "text-info", neutral: "text-ink" } as const;
export const toneBg = { good: "bg-gain", bad: "bg-loss", warn: "bg-warn", info: "bg-info", neutral: "bg-ink" } as const;
export const toneSoft = { good: "bg-gain-bg", bad: "bg-loss-bg", warn: "bg-warn-bg", info: "bg-info-bg", neutral: "bg-white" } as const;
/** Icon chip: a light tint of the tone with the tone as the glyph colour. */
export const toneChip = { good: "bg-gain/10 text-gain", bad: "bg-loss/10 text-loss", warn: "bg-warn/10 text-warn", info: "bg-info/10 text-info", neutral: "bg-tint text-ink" } as const;

/** Filled line chart of a series, stretched to its box. */
export function AreaChart({ values, label, className, color = "var(--color-ink)" }: { values: number[]; label: string; className?: string; color?: string }) {
  const max = Math.max(...values, 1), n = Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => `${(i / n) * 100},${38 - (v / max) * 36}`);
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label={label} className={cn("h-40 w-full", className)}>
      {values.length > 0 && <polygon points={`0,40 ${pts.join(" ")} 100,40`} fill={color} opacity="0.08" />}
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export const PALETTE = ["#111111", "#15803d", "#d97706", "#737373"];

/** Ring split into slices; the centre shows a caption. */
export function Donut({ slices, label, center }: { slices: { name: string; value: number }[]; label: string; center?: React.ReactNode }) {
  const total = slices.reduce((t, s) => t + s.value, 0);
  let acc = 0;
  return (
    <div className="flex items-center gap-6">
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 36 36" role="img" aria-label={label} className="size-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--color-tint)" strokeWidth="4" />
          {total > 0 && slices.map((s, i) => {
            const len = (Math.max(s.value, 0) / total) * 100, off = acc;
            acc += len;
            return <circle key={s.name} cx="18" cy="18" r="15.9" fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth="4" pathLength={100} strokeDasharray={`${len} ${100 - len}`} strokeDashoffset={-off} />;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">{center}</div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2 text-[13px]">
        {slices.map((s, i) => (
          <li key={s.name} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="flex-1 truncate text-sub">{s.name}</span>
            <span className="num text-muted">{total > 0 ? Math.round((Math.max(s.value, 0) / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal progress toward a limit, coloured by tone. */
export function Meter({ ratio, tone }: { ratio: number; tone: keyof typeof toneBg }) {
  return (
    <div className="h-1.5 w-full bg-tint" role="progressbar" aria-valuenow={Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full transition-[width] duration-500 ease-out", toneBg[tone])} style={{ width: `${Math.min(Math.max(ratio, 0), 1) * 100}%` }} />
    </div>
  );
}
