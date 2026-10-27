/** A label and value with a thin bar under it. ratio is 0 to 1. */
export function BarRow({ label, value, ratio }: { label: string; value: string; ratio: number }) {
  return (
    <div>
      <div className="flex justify-between gap-3">
        <span className="truncate">{label}</span>
        <span className="num shrink-0 text-muted">{value}</span>
      </div>
      <div className="mt-1.5 h-1 rounded-sm bg-tint">
        <div className="h-1 rounded-sm bg-ink" style={{ width: `${Math.min(Math.max(ratio, 0), 1) * 100}%` }} />
      </div>
    </div>
  );
}
