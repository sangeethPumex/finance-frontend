"use client";

import { useState } from "react";
import { Lightning, Mountains, Snowflake } from "@phosphor-icons/react";
import { type Strategy, usePayoffPlan } from "@/lib/api";
import { cn } from "@/lib/cn";
import { inr } from "@/lib/money";
import { Input } from "../atoms";

const rs = (n: number) => inr(Math.round(n * 100));
const LABEL = { scheduled: ["As scheduled", "Pay each EMI only", Lightning], avalanche: ["Avalanche", "Extra to the highest rate first", Mountains], snowball: ["Snowball", "Extra to the smallest balance first", Snowflake] } as const;
const span = (m: number) => `${Math.floor(m / 12) ? `${Math.floor(m / 12)}y ` : ""}${m % 12}m`;

function Plan({ s, best }: { s: Strategy; best: boolean }) {
  const [name, hint, Icon] = LABEL[s.method];
  return (
    <div className={cn("border p-4", best ? "border-ink" : "border-line")}>
      <div className="flex items-center gap-2 text-[13px] font-semibold"><Icon size={16} />{name}{best && <span className="bg-tint px-1.5 py-0.5 text-[11px] font-medium text-gain">Cheapest</span>}</div>
      <p className="text-[11px] text-muted">{hint}</p>
      <div className="num mt-3 text-[22px] font-light leading-none">{s.neverEnds ? "Never clears" : span(s.months)}</div>
      <div className="mt-1 text-[12px] text-muted">{rs(s.interest)} interest</div>
      {s.method !== "scheduled" && s.interestSaved > 0 && <div className="mt-2 text-[12px] font-semibold text-gain">Saves {rs(s.interestSaved)} and {span(s.monthsSaved)}</div>}
      {s.order.length > 0 && <ol className="mt-3 space-y-0.5 border-t border-line-soft pt-2 text-[11px] text-sub">{s.order.map((o) => <li key={o.name} className="flex justify-between gap-2"><span className="truncate">{o.name}</span><span className="num text-muted">month {o.month}</span></li>)}</ol>}
    </div>
  );
}

/** Compares paying EMIs as scheduled with avalanche and snowball prepayment, for a monthly extra the user types. */
export function PayoffPlanner() {
  const [extra, setExtra] = useState("5000");
  const n = Number(extra), valid = extra.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= 1e8;
  const q = usePayoffPlan(valid ? n : 0);
  const plan = q.data;
  if (!plan || plan.debts.length === 0) return null;
  const [sch, ava, snow] = plan.strategies;
  const best = ava.interest <= snow.interest ? "avalanche" : "snowball";

  return (
    <section className="mt-4 border border-line bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">Payoff planner</h2>
          <p className="text-[12px] text-muted">How fast you clear {plan.debts.length} active debt{plan.debts.length === 1 ? "" : "s"} ({rs(plan.debts.reduce((a, d) => a + d.balance, 0))}) with extra money each month. An estimate: interest is rate ÷ 12 on the balance.</p>
        </div>
        <label className="text-[12px] text-muted">Extra a month (₹)<Input type="number" min={0} step="any" value={extra} onChange={(e) => setExtra(e.target.value)} className="mt-1 w-36" /></label>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Plan s={sch} best={false} />
        <Plan s={ava} best={valid && n > 0 && best === "avalanche"} />
        <Plan s={snow} best={valid && n > 0 && best === "snowball"} />
      </div>
    </section>
  );
}
