"use client";

import { useState } from "react";
import { Timer } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { inr } from "@/lib/money";
import { Card, toneBg, toneText } from "../molecules";

const tone = (d: number) => (d < 30 ? "bad" : d < 90 ? "warn" : "good") as "bad" | "warn" | "good";
const span = (d: number) => (d < 60 ? { n: `${d}`, u: d === 1 ? "day" : "days" } : d < 730 ? { n: (d / 30.4).toFixed(1), u: "months" } : { n: (d / 365).toFixed(1), u: "years" });
const days = (pool: number, burn: number) => Math.max(Math.floor(pool / (burn / 30)), 0);
/** ₹1.14L style, for a figure that sits beside a large number. */
const short = (paise: number) => { const r = paise / 100; return r >= 1e7 ? `₹${(r / 1e7).toFixed(2)}Cr` : r >= 1e5 ? `₹${(r / 1e5).toFixed(2)}L` : inr(paise); };
const words = (d: number) => { const s = span(d); return `${s.n} ${s.u}`; };
const STEP = 100_000; // ₹1,000

/** How long money lasts if income stopped: cash first, then investments sold. The slider re-runs both with a different monthly spend. */
export function RunwayPanel({ cashPaise, worthPaise, burnPaise, netPaise, className }: {
  cashPaise: number; worthPaise: number; burnPaise: number; netPaise: number; className?: string;
}) {
  const [pick, setPick] = useState<{ base: number; v: number }>();
  const pool = Math.max(worthPaise, cashPaise);
  const lo = Math.round((burnPaise * 0.2) / STEP) * STEP || STEP, hi = Math.round((burnPaise * 1.5) / STEP) * STEP;
  // A new backend figure discards the slider position.
  const burn = pick && pick.base === burnPaise ? pick.v : burnPaise;

  if (burnPaise <= 0) {
    return <Card title="Financial runway" icon={Timer} className={className}><p className="text-[13px] text-muted">No spending, fixed costs or EMIs recorded yet, so there is nothing to run down.</p></Card>;
  }

  const cash = days(cashPaise, burn), total = days(pool, burn), t = tone(cash), h = span(cash);
  const cashShare = total > 0 ? Math.min(cash / total, 1) * 100 : 100;
  const changed = burn !== burnPaise;

  return (
    <Card title="Financial runway" icon={Timer} className={className}>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:gap-10">
        <div>
          <div className="text-[12px] text-muted">Available cash, if income stopped</div>
          <div className={cn("num mt-1 whitespace-nowrap text-[44px] font-semibold leading-none sm:text-[56px]", toneText[t])}>{h.n}<span className="ml-2 text-[16px] font-medium text-muted">{h.u}</span></div>
          <div className="num mt-2 text-[13px] text-muted">{inr(cashPaise)}</div>

          <div className="mt-6" aria-hidden>
            <div className="flex h-2.5 gap-px bg-surface">
              <div className={toneBg[t]} style={{ width: `${cashShare}%` }} />
              <div className="flex-1 bg-info/40" />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-faint"><span>Today</span><span>Investments run out · {words(total)}</span></div>
          </div>
        </div>

        <dl className="grid grid-cols-2 content-start gap-x-6 gap-y-5 border-t border-line pt-5 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <div className="col-span-2">
            <dt className="text-[12px] text-muted">Monthly spending</dt>
            <dd className="num mt-1 flex flex-wrap items-baseline gap-x-3 text-[30px] font-semibold leading-none">
              {inr(burn)}
              {changed && <span className={cn("text-[13px] font-medium", burn < burnPaise ? "text-gain" : "text-loss")}>{burn < burnPaise ? "−" : "+"}{short(Math.abs(burnPaise - burn))} a month</span>}
            </dd>
            <dd className="mt-2 inline-flex items-center gap-2 bg-tint px-2.5 py-1 text-[12px] text-sub">Current spending <span className="num font-semibold text-ink">{inr(burnPaise)}</span></dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[12px] text-muted">Including investments</dt>
            <dd className="num mt-1 text-[26px] font-semibold leading-none">{span(total).n}<span className="ml-1.5 text-[12px] font-medium text-muted">{span(total).u}</span><span className="ml-3 text-[12px] font-normal text-muted">{inr(worthPaise)}</span></dd>
          </div>
          <div className="col-span-2">
            <label htmlFor="runway-spend" className="flex items-baseline justify-between text-[12px] text-muted">
              <span>What if I spend less?</span>
              {changed && <button type="button" onClick={() => setPick(undefined)} className="text-[12px] font-medium text-ink underline underline-offset-2">Back to current</button>}
            </label>
            <input id="runway-spend" type="range" min={lo} max={hi} step={STEP} value={Math.min(Math.max(burn, lo), hi)} onChange={(e) => setPick({ base: burnPaise, v: Number(e.target.value) })} className="mt-2 w-full accent-ink" />
            <div className="num relative h-4 text-[11px] text-faint" aria-hidden>
              <span className="absolute left-0">{short(lo)}</span>
              <span className="absolute font-semibold text-ink" style={{ left: `${((burnPaise - lo) / (hi - lo)) * 100}%`, transform: "translateX(-50%)" }}>▲ now</span>
              <span className="absolute right-0">{short(hi)}</span>
            </div>
          </div>
        </dl>
      </div>

      <div className={cn("mt-6 border-l-[3px] bg-tint px-4 py-3.5", netPaise < 0 ? "border-loss" : "border-gain")}>
        <p className="text-[15px] leading-relaxed text-ink">
          If your income stopped today, your cash would last <b className={cn("num font-semibold", toneText[t])}>{words(cash)}</b>.
          Selling your investments too stretches that to <b className="num font-semibold text-info">{words(total)}</b>.{" "}
          {netPaise < 0
            ? <>Right now you spend <b className="num font-semibold text-loss">{inr(-netPaise)}</b> more each month than you earn.</>
            : <>Right now your income covers everything, with <b className="num font-semibold text-gain">{inr(netPaise)}</b> left over each month.</>}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] text-muted">
          {["Recent spending", "Fixed costs", "EMIs", "SIPs paused", "No income"].map((c) => <span key={c} className="border border-line bg-surface px-2 py-0.5">{c}</span>)}
        </div>
      </div>
    </Card>
  );
}
