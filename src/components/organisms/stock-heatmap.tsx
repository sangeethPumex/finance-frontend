import type { StockPosition } from "@/lib/api";

type Rect = { p: StockPosition; x: number; y: number; w: number; h: number };

/** Binary-split treemap: halves the list by value, cutting across the longer side. Rects are in percent. */
function layout(items: StockPosition[], x: number, y: number, w: number, h: number): Rect[] {
  if (items.length === 1) return [{ p: items[0], x, y, w, h }];
  const total = items.reduce((t, i) => t + i.value, 0);
  let k = 1, acc = items[0].value;
  while (k < items.length - 1 && acc + items[k].value / 2 < total / 2) acc += items[k++].value;
  const f = total > 0 ? acc / total : 0.5, a = items.slice(0, k), b = items.slice(k);
  return w >= h
    ? [...layout(a, x, y, w * f, h), ...layout(b, x + w * f, y, w * (1 - f), h)]
    : [...layout(a, x, y, w, h * f), ...layout(b, x, y + h * f, w, h * (1 - f))];
}

export type HeatMetric = "day" | "total";

/** Treemap of holdings: tile area is current value, colour is the day's move or the total return. */
export function StockHeatmap({ positions, metric, onOpen }: { positions: StockPosition[]; metric: HeatMetric; onOpen: (symbol: string) => void }) {
  const sorted = [...positions].filter((p) => p.value > 0).sort((a, b) => b.value - a.value);
  if (sorted.length === 0) return null;
  const cap = metric === "day" ? 0.03 : 0.3; // the move that gets full colour
  return (
    <div className="relative h-80 w-full overflow-hidden bg-line md:h-96">
      {layout(sorted, 0, 0, 100, 100).map(({ p, x, y, w, h }) => {
        const v = metric === "day" ? p.dayPct : p.pnlPct;
        const alpha = 0.2 + 0.8 * Math.min(1, Math.abs(v) / cap);
        const bg = p.price === undefined || v === 0 ? "var(--color-tint)" : `rgb(${v > 0 ? "21 128 61" : "220 38 38"} / ${alpha})`;
        const light = p.price === undefined || v === 0 || alpha < 0.55;
        return (
          <button key={p.symbol} type="button" onClick={() => onOpen(p.symbol)} title={`${p.name ?? p.symbol}: ${(v * 100).toFixed(2)}%`}
            className={`absolute flex flex-col items-center justify-center overflow-hidden border border-white p-1 text-center transition-opacity hover:opacity-80 ${light ? "text-ink" : "text-white"}`}
            style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`, background: bg }}>
            <span className="max-w-full truncate text-[12px] font-semibold">{p.symbol.split(".")[0]}</span>
            {w * h > 300 && <span className="num text-[11px]">{v >= 0 ? "+" : ""}{(v * 100).toFixed(2)}%</span>}
          </button>
        );
      })}
    </div>
  );
}
