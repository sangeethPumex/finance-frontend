"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { type NWPoint, type NWRange, useNetWorth } from "@/lib/api";
import { inr } from "@/lib/money";

type View = "networth" | "assets" | "cash";
const VIEWS: { value: View; label: string }[] = [{ value: "networth", label: "Net worth" }, { value: "assets", label: "Net worth vs owed" }, { value: "cash", label: "Cash" }];
const RANGES: NWRange[] = ["1m", "3m", "6m", "1y"];
// Palette is black, red, green, yellow, purple only: net worth black, owed red, cash green, projection purple, today's marker yellow.
const INK = "#1c1c1b", RED = "#c62828", GREEN = "#1f8a5b", YELLOW = "#d9a406", PURPLE = "#7c3aed";
const SERIES: Record<View, { label: string; get: (p: NWPoint) => number | undefined; color: string }[]> = {
  networth: [{ label: "Net worth", get: (p) => p.netWorthPaise, color: INK }],
  assets: [{ label: "Net worth", get: (p) => p.netWorthPaise, color: INK }, { label: "Owed", get: (p) => p.owedPaise, color: RED }],
  cash: [{ label: "Cash", get: (p) => p.cashPaise, color: GREEN }],
};
/** Monotone cubic through the points: smooth, but never overshoots a flat stretch into a bump. */
const smooth = (pts: number[][]) => {
  const n = pts.length;
  if (n < 3) return pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join("");
  const dx = pts.slice(1).map((p, i) => p[0] - pts[i][0]), sl = pts.slice(1).map((p, i) => (dx[i] ? (p[1] - pts[i][1]) / dx[i] : 0));
  const m = pts.map((_, i) => (i === 0 ? sl[0] : i === n - 1 ? sl[n - 2] : sl[i - 1] * sl[i] <= 0 ? 0 : (sl[i - 1] + sl[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (sl[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / sl[i], b = m[i + 1] / sl[i], h = Math.hypot(a, b);
    if (h > 3) { m[i] = (3 * a / h) * sl[i]; m[i + 1] = (3 * b / h) * sl[i]; }
  }
  return pts.slice(1).reduce((d, p, i) => `${d}C${(pts[i][0] + dx[i] / 3).toFixed(1)},${(pts[i][1] + m[i] * dx[i] / 3).toFixed(1)} ${(p[0] - dx[i] / 3).toFixed(1)},${(p[1] - m[i + 1] * dx[i] / 3).toFixed(1)} ${p[0].toFixed(1)},${p[1].toFixed(1)}`, `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`);
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
    smooth(pts.flatMap((p) => { const v = get(p); return v === undefined ? [] : [[x(day(p.date)), y(v)]]; }));
  const shown = hover === undefined ? cur : all[hover];
  const projected = hover !== undefined && hover >= hist.length;
  const end = (get: (p: NWPoint) => number | undefined) => { const p = proj[proj.length - 1]; return p && get(p) !== undefined ? { x: x(day(p.date)), y: y(get(p)!), v: get(p)! } : undefined; };

  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-5 sm:px-6">
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
            <g key={s.label} fill="none" strokeWidth={2}>
              <defs><linearGradient id={`nw-${s.label}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={s.color} stopOpacity={0.18} /><stop offset="1" stopColor={s.color} stopOpacity={0} /></linearGradient></defs>
              <path d={`${path(hist, s.get)}L${x(day(cur.date))},${H - PAD.b}L${x(day(hist[0].date))},${H - PAD.b}Z`} stroke="none" fill={`url(#nw-${s.label})`} />
              <path d={path(hist, s.get)} stroke={s.color} strokeLinecap="round" />
              <path d={path([cur, ...proj], s.get)} stroke={PURPLE} strokeWidth={1.75} strokeDasharray="2 5" strokeLinecap="round" />
              {hist.map((p, i) => s.get(p) !== undefined && <circle key={p.date} cx={x(day(p.date))} cy={y(s.get(p)!)} r={i === hist.length - 1 ? 4 : 2} stroke="none" fill={i === hist.length - 1 ? YELLOW : s.color} />)}
              {e && <text x={e.x + 8} y={e.y + 4} stroke="none" fill={PURPLE} className="text-[11px] font-medium">{lakh(e.v)}</text>}
            </g>
          );
        })}
        {hover !== undefined && series.map((s) => s.get(all[hover]) !== undefined && <circle key={s.label} cx={x(day(all[hover].date))} cy={y(s.get(all[hover])!)} r={5} fill="none" strokeWidth={1.5} stroke={projected ? PURPLE : s.color} />)}
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
