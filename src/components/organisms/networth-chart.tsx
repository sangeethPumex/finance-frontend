"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { type NWPoint, type NWRange, useNetWorth } from "@/lib/api";
import { inr } from "@/lib/money";

type View = "networth" | "assets" | "cash";
const VIEWS: { value: View; label: string }[] = [{ value: "networth", label: "Net worth" }, { value: "assets", label: "Net worth vs owed" }, { value: "cash", label: "Cash" }];
const RANGES: NWRange[] = ["1m", "3m", "6m", "1y"];
// Black line, grey dashes. The only colour is red, on the owed line.
const SERIES: Record<View, { label: string; get: (p: NWPoint) => number | undefined; stroke: string; fill: string }[]> = {
  networth: [{ label: "Net worth", get: (p) => p.netWorthPaise, stroke: "stroke-ink", fill: "fill-ink" }],
  assets: [{ label: "Net worth", get: (p) => p.netWorthPaise, stroke: "stroke-ink", fill: "fill-ink" }, { label: "Owed", get: (p) => p.owedPaise, stroke: "stroke-loss", fill: "fill-loss" }],
  cash: [{ label: "Cash", get: (p) => p.cashPaise, stroke: "stroke-ink", fill: "fill-ink" }],
};
const PAD = { l: 8, r: 64, t: 24, b: 22 };
const day = (d: string) => new Date(`${d}T00:00:00Z`).getTime();
const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit", timeZone: "UTC" });
// 1 lakh = 1e5 rupees = 1e7 paise; 1 crore = 1e9 paise.
const lakh = (paise: number) => Math.abs(paise) >= 1e9 ? `₹${(paise / 1e9).toFixed(2)}Cr` : `₹${(paise / 1e7).toFixed(2)}L`;
const Link = ({ on, children, ...p }: { on: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button type="button" {...p} className={cn("text-[12px] transition-colors", on ? "font-medium text-ink underline underline-offset-4" : "text-muted hover:text-sub")}>{children}</button>
);

/** Draws what the backend's net-worth endpoint returns: recorded history, solid; one projection scenario, dashed. */
export function NetWorthChart() {
  const [range, setRange] = useState<NWRange>("6m"), [view, setView] = useState<View>("networth"), [scn, setScn] = useState(0), [hover, setHover] = useState<number>();
  const q = useNetWorth(range);
  // Draw at the real width so labels stay 11px on a phone instead of shrinking with the picture.
  const box = useRef<HTMLDivElement>(null), [W, setW] = useState(800);
  const H = W < 520 ? 180 : 200;
  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width) || 800));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, [q.data]);
  const d = q.data;
  if (!d || !d.history.length) return <p className="text-[13px] text-muted">{q.error ? q.error.message : d ? "No net-worth history recorded yet." : "Loading…"}</p>;

  const hist = d.history, proj = d.scenarios[scn]?.points ?? [];
  const all = [...hist, ...proj], cur = hist[hist.length - 1];
  const series = SERIES[view];
  const xs = all.map((p) => day(p.date)), x0 = Math.min(...xs), x1 = Math.max(...xs);
  const vals = all.flatMap((p) => series.map((s) => s.get(p))).filter((v): v is number => v !== undefined);
  const lo0 = Math.min(...vals), hi0 = Math.max(...vals), padV = (hi0 - lo0) * 0.15 || Math.abs(hi0) * 0.1 || 1, lo = lo0 - padV, hi = hi0 + padV;
  const x = (t: number) => PAD.l + (x1 === x0 ? 0 : ((t - x0) / (x1 - x0)) * (W - PAD.l - PAD.r));
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  // A hand-entered month has no cash or owed figure, so those lines skip it rather than draw a zero.
  const path = (pts: NWPoint[], get: (p: NWPoint) => number | undefined) =>
    pts.flatMap((p) => { const v = get(p); return v === undefined ? [] : [[x(day(p.date)), y(v)]]; }).map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join("");
  const shown = hover === undefined ? cur : all[hover];
  const projected = hover !== undefined && hover >= hist.length;
  const end = (get: (p: NWPoint) => number | undefined) => { const p = proj[proj.length - 1]; return p && get(p) !== undefined ? { x: x(day(p.date)), y: y(get(p)!), v: get(p)! } : undefined; };

  return (
    <div className="rounded-lg border border-line bg-white px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight">Where your net worth is heading</h3>
          <p className="mt-0.5 text-[12px] text-muted">Recorded history (daily once snapshots begin), then a {d.scenarios[scn]?.name.toLowerCase()} projection · {lakh(cur.netWorthPaise)} today</p>
        </div>
        <div className="flex flex-col gap-1.5 sm:items-end">
          <div className="flex flex-wrap gap-x-4 gap-y-1">{VIEWS.map((v) => <Link key={v.value} on={view === v.value} onClick={() => setView(v.value)}>{v.label}</Link>)}</div>
          <div className="flex gap-4">{RANGES.map((r) => <Link key={r} on={range === r} onClick={() => setRange(r)}>{r.toUpperCase()}</Link>)}</div>
        </div>
      </div>

      <div ref={box} className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block touch-pan-y" role="img" aria-label="Net worth over time, with a dashed projection"
        onPointerLeave={() => setHover(undefined)}
        onPointerMove={(e) => {
          const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
          setHover(all.reduce((b, p, i) => (Math.abs(x(day(p.date)) - px) < Math.abs(x(day(all[b].date)) - px) ? i : b), 0));
        }}>
        {series.map((s) => {
          const e = end(s.get);
          return (
            <g key={s.label} fill="none" strokeWidth={1.25}>
              <path d={path(hist, s.get)} className={s.stroke} />
              <path d={path([cur, ...proj], s.get)} className="stroke-muted" strokeDasharray="2 4" />
              {hist.map((p) => s.get(p) !== undefined && <circle key={p.date} cx={x(day(p.date))} cy={y(s.get(p)!)} r={2.5} stroke="none" className={s.fill} />)}
              {e && <text x={e.x + 8} y={e.y + 4} stroke="none" className="fill-muted text-[11px]">{lakh(e.v)}</text>}
            </g>
          );
        })}
        {hover !== undefined && series.map((s) => s.get(all[hover]) !== undefined && <circle key={s.label} cx={x(day(all[hover].date))} cy={y(s.get(all[hover])!)} r={5} fill="none" strokeWidth={1} className={s.stroke} />)}
        <text x={PAD.l} y={H - 4} className="fill-muted text-[11px]">{fmt(hist[0].date)}</text>
        <text x={x(day(cur.date))} y={H - 4} textAnchor="middle" className="fill-muted text-[11px]">today</text>
        <text x={W - PAD.r} y={H - 4} textAnchor="end" className="fill-muted text-[11px]">{fmt(all[all.length - 1].date)}</text>
      </svg>
      </div>

      <p className="mt-1 flex flex-wrap gap-x-4 text-[12px] text-sub">
        <span className="font-medium text-ink">{fmt(shown.date)}{projected && " · projected"}</span>
        <span>Net worth {inr(shown.netWorthPaise)}</span>
        {shown.cashPaise !== undefined && <span>Cash {inr(shown.cashPaise)}</span>}
        {shown.investmentsPaise !== undefined && <span>Investments {inr(shown.investmentsPaise)}</span>}
        {shown.owedPaise !== undefined && <span>Owed {inr(shown.owedPaise)}</span>}
        {hover !== 0 && <span className="text-muted">{shown.changePaise >= 0 ? "+" : ""}{inr(shown.changePaise)} vs previous</span>}
      </p>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-3">
        {d.scenarios.map((s, i) => (
          <button key={s.name} type="button" onClick={() => setScn(i)} title={s.assumptions} className={cn("text-[12px]", i === scn ? "font-medium text-ink" : "text-muted hover:text-sub")}>
            {s.name} · {lakh(s.points[s.points.length - 1].netWorthPaise)} in 3 months
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted">{d.scenarios[scn]?.assumptions}. {d.method}</p>
    </div>
  );
}
