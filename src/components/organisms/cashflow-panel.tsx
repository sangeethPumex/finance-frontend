"use client";

import { useState } from "react";
import Link from "next/link";
import { ChartBar, X } from "@phosphor-icons/react";
import type { Dashboard, Flow } from "@/lib/api";
import { shortDate } from "@/lib/dates";
import { inr } from "@/lib/money";
import { AreaChart, Card, EmptyState, Tabs } from "../molecules";
import { Sankey, TONE_COLOR } from "./sankey";

type View = "flow" | "trend" | "categories";
const VIEWS: { value: View; label: string }[] = [{ value: "flow", label: "Money flow" }, { value: "trend", label: "Spending trend" }, { value: "categories", label: "Categories" }];

type Props = { cashflow: Dashboard["cashflow"]; loading: boolean };

const pct = (p: number, of: number) => (of > 0 ? `${Math.round((p / of) * 100)}%` : "–");

/** The chart card (flow / trend / categories) with a drill-down panel beside it. */
export function CashflowPanel({ cashflow: data, loading }: Props) {
  const [view, setView] = useState<View>("flow");
  const [sel, setSel] = useState<Flow | null>(null);
  const base = data.incomePaise || data.spentPaise;
  const empty = data.sources.length === 0 && data.dests.length === 0;
  const peak = data.daily.reduce((m, d) => (d.paise > m.paise ? d : m), { date: "", paise: 0 } as Dashboard["cashflow"]["daily"][number]);
  const spendFlows = data.dests.filter((f) => f.tone !== "net");

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
      <Card title="Where your money goes" icon={ChartBar} action={<Tabs<View> value={view} items={VIEWS} onChange={setView} />}>
        {loading ? (
          <div className="h-72 animate-pulse bg-tint" />
        ) : empty ? (
          <EmptyState icon={ChartBar}>No income or spending in this period yet. Pick another period, or wait for new bank messages to arrive.</EmptyState>
        ) : view === "flow" ? (
          <Sankey sources={data.sources} dests={data.dests} income={data.incomePaise} selected={sel?.id} onSelect={setSel} />
        ) : view === "trend" ? (
          <>
            <AreaChart label="Daily spending" values={data.daily.map((d) => d.paise)} color="var(--color-ink)" />
            {peak.paise > 0 && (
              <p className="mt-2 text-[12px] text-muted">
                Peak {inr(peak.paise)} on {shortDate(peak.date)}{peak.top && <> · largest was <Link href="/transactions" className="text-ink underline">{peak.top.vendor}</Link> ({peak.top.category}, {inr(peak.top.paise)})</>}
              </p>
            )}
          </>
        ) : (
          <div className="space-y-3">
            {spendFlows.map((f) => (
              <button key={f.id} type="button" onClick={() => setSel(f)} className="block w-full text-left">
                <div className="flex justify-between gap-3 text-[13px]"><span className="truncate">{f.name}</span><span className="num text-muted">{inr(f.paise)} · {pct(f.paise, base)}</span></div>
                <div className="mt-1.5 h-1 bg-tint"><div className="h-1" style={{ width: `${(f.paise / Math.max(...spendFlows.map((x) => x.paise), 1)) * 100}%`, background: TONE_COLOR[f.tone] }} /></div>
              </button>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
          {([["income", "Income"], ["spend", "Spending"], ["discretionary", "Discretionary"], ["invest", "Invested"]] as const).map(([t, l]) => (
            <span key={t} className="flex items-center gap-1.5"><span className="size-2" style={{ background: TONE_COLOR[t] }} />{l}</span>
          ))}
        </div>
      </Card>

      <Card title={sel ? sel.name : "Drill down"} action={sel && <button type="button" onClick={() => setSel(null)} aria-label="Clear selection" className="text-muted hover:text-ink"><X size={16} /></button>}>
        {!sel ? (
          <p className="text-[13px] text-muted">Select a source or category in the chart to see its transactions, total and share of income.</p>
        ) : (
          <>
            <div className="num text-[24px] font-light leading-none">{inr(sel.paise)}</div>
            <div className="mt-2 text-[12px] text-muted">{pct(sel.paise, data.incomePaise)} of income · {sel.count} transaction{sel.count === 1 ? "" : "s"}</div>
            {sel.txns.length === 0 ? <p className="mt-4 text-[13px] text-muted">No individual transactions behind this figure.</p> : (
              <ul className="mt-4 divide-y divide-line-soft text-[13px]">
                {sel.txns.map((t) => (
                  <li key={t.id} className="flex justify-between gap-3 py-2">
                    <span className="min-w-0"><span className="block truncate">{t.vendor}</span><span className="text-[11px] text-muted">{shortDate(t.at)}{t.source && ` · ${t.source}`}</span></span>
                    <span className="num shrink-0">{inr(t.paise)}</span>
                  </li>
                ))}
              </ul>
            )}
            {sel.count > sel.txns.length && <Link href="/transactions" className="mt-3 block text-[12px] text-muted underline">View all transactions</Link>}
          </>
        )}
      </Card>
    </div>
  );
}
