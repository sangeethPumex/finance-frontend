"use client";

import { cn } from "@/lib/cn";
import { type LoanRow, type LoanTotals, useEmiSchedule } from "@/lib/api";
import { inr } from "@/lib/money";

const rs = (n: number) => inr(Math.round(n * 100));
const when = (s: string | undefined, o: Intl.DateTimeFormatOptions) => {
  const t = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(+t) ? "–" : t.toLocaleDateString("en-IN", { ...o, timeZone: "UTC" });
};
const d = (s?: string) => when(s, { day: "numeric", month: "short" });
const month = (s: string | undefined, style: "short" | "long" = "short") => when(s, { month: style, year: "numeric" });
// Phones keep Month, Interest, Principal and Balance; the rest need the width.
const WIDE = "hidden sm:table-cell";
const COLS: [string, boolean][] = [["Month", false], ["Rate", true], ["Interest", false], ["EMI", true], ["Extra", true], ["Principal", false], ["Balance", false], ["Split", true]];

/** Principal (black) against interest (red) in one thin bar, with the percentages beside it. */
const Split = ({ r }: { r: LoanRow }) => (
  <span className="flex items-center gap-2" title={`${r.principalPct}% principal · ${r.interestPct}% interest`}>
    <span className="flex h-1.5 w-14 overflow-hidden rounded-full bg-loss"><span className="bg-ink" style={{ width: `${r.principalPct}%` }} /></span>
    <span className="num text-[11px] text-muted">{Math.round(r.principalPct)}/{Math.round(r.interestPct)}</span>
  </span>
);

const Total = ({ label, t }: { label: string; t: LoanTotals }) => (
  <tr className="border-t border-line bg-tint font-medium">
    <td className="px-3 py-2">{label}</td><td className={WIDE} />
    <td className="num px-3 py-2 text-right text-loss">{rs(t.interest)}</td><td className={cn(WIDE, "num px-3 py-2 text-right")}>{rs(t.emi)}</td>
    <td className={cn(WIDE, "num px-3 py-2 text-right")}>{t.extra > 0 ? rs(t.extra) : "–"}</td><td className="num px-3 py-2 text-right">{rs(t.principal)}</td><td /><td className={WIDE} />
  </tr>
);

/** The lender's statement so far, then every period still to come. All figures are computed by the backend. */
export function LoanSchedule({ id }: { id: string }) {
  const q = useEmiSchedule(id);
  const s = q.data;
  if (!s) return <p className="text-[13px] text-muted">{q.error ? q.error.message : "Loading…"}</p>;
  if (!s.available) return <p className="text-[13px] text-muted">Add the interest rate and balance to see the breakdown.</p>;
  const firstFuture = s.rows.findIndex((r) => r.future);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[13px]">
        {s.neverEnds ? <span className="text-loss">The EMI no longer covers the interest.</span> : <span><span className="font-medium">{s.months} payments left</span> <span className="text-muted">· clears {month(s.clearsOn)}</span></span>}
        <span className="text-muted">Interest still to pay <span className="num font-medium text-loss">{rs(s.ahead.interest)}</span></span>
      </div>
      <div className="max-h-[60dvh] overflow-auto rounded-md border border-line">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-white text-muted">
            <tr className="border-b border-line">{COLS.map(([h, wide], i) => <th key={h} className={cn("px-3 py-2 text-left font-medium", wide && WIDE, i > 0 && i < 7 && "text-right")}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {s.rows.map((r, i) => (
              <tr key={r.from} className={cn("border-b border-line-soft", r.future ? "text-muted" : "bg-gain-bg", i === firstFuture && "border-t-2 border-t-ink")}>
                <td className="whitespace-nowrap px-3 py-2" title={`${d(r.from)}–${d(r.to)}, paid ${d(r.paidOn)}`}>{month(r.paidOn ?? r.to, "long")}</td>
                <td className={cn(WIDE, "num px-3 py-2 text-right")}>{r.rate}%</td>
                <td className="num px-3 py-2 text-right text-loss">{rs(r.interest)}</td>
                <td className={cn(WIDE, "num px-3 py-2 text-right")}>{rs(r.emi)}</td>
                <td className={cn(WIDE, "num px-3 py-2 text-right")}>{r.extra > 0 ? rs(r.extra) : "–"}</td>
                <td className="num px-3 py-2 text-right">{rs(r.principal)}</td>
                <td className="num px-3 py-2 text-right">{rs(r.closing)}</td>
                <td className={cn(WIDE, "px-3 py-2")}><Split r={r} /></td>
              </tr>
            ))}
            {s.rows.some((r) => !r.future) && <Total label="Paid so far" t={s.past} />}
            {s.months > 0 && <Total label="Still to pay" t={s.ahead} />}
          </tbody>
        </table>
      </div>
      {firstFuture >= 0 && <p className="mt-2 text-[11px] text-muted">Green is paid. Below the black line is projected at the current rate.</p>}
    </div>
  );
}
