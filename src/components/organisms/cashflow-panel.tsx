"use client";

import { useState } from "react";
import Link from "next/link";
import { ChartBar, X } from "@phosphor-icons/react";
import type { Dashboard, Flow } from "@/lib/api";
import { shortDate } from "@/lib/dates";
import { inr } from "@/lib/money";
import { AreaChart, Card, EmptyState, Tabs } from "../molecules";
import { Sankey, TONE_COLOR } from "./sankey";

const R = 80, C = 100;
/** Donut of where the money went; slices and legend rows are both clickable. */
function Pie({ flows, selected, onSelect }: { flows: Flow[]; selected?: string; onSelect: (f: Flow) => void }) {
  const total = flows.reduce((t, f) => t + f.paise, 0);
  if (total <= 0) return null;
  let a = -Math.PI / 2;
  const pt = (t: number) => `${C + R * Math.cos(t)},${C + R * Math.sin(t)}`;
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <svg viewBox="0 0 200 200" role="img" aria-label="Share of each destination" className="size-56 shrink-0">
        {flows.map((f) => {
          const sweep = Math.min((f.paise / total) * 2 * Math.PI, 2 * Math.PI - 0.001), s = a;
          a += sweep;
          return (
            <path key={f.id} d={`M${pt(s)} A${R},${R} 0 ${sweep > Math.PI ? 1 : 0} 1 ${pt(s + sweep)}`} fill="none" stroke={TONE_COLOR[f.tone]} strokeWidth={selected === f.id ? 36 : 28}
              opacity={selected && selected !== f.id ? 0.35 : 1} style={{ cursor: "pointer" }} onClick={() => onSelect(f)}><title>{`${f.name}: ${inr(f.paise)}`}</title></path>
          );
        })}
        <text x={C} y={C - 2} textAnchor="middle" fontSize="11" fill="#737373">Total</text>
        <text x={C} y={C + 14} textAnchor="middle" fontSize="13" fill="#1c1c1b">{inr(total)}</text>
      </svg>
      <ul className="w-full min-w-0 flex-1 space-y-1 text-[13px]">
        {flows.map((f) => (
          <li key={f.id}>
            <button type="button" onClick={() => onSelect(f)} className={`flex w-full items-center gap-2 py-0.5 text-left ${selected && selected !== f.id ? "opacity-50" : ""}`}>
              <span className="size-2 shrink-0" style={{ background: TONE_COLOR[f.tone] }} />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="num text-muted">{inr(f.paise)} · {pct(f.paise, total)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

type View = "flow" | "pie" | "trend" | "categories";
const VIEWS: { value: View; label: string }[] = [{ value: "flow", label: "Money flow" }, { value: "pie", label: "Share" },{ value: "trend", label: "Spending trend" }, { value: "categories", label: "Categories" }];

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
          <Sankey sources={data.sources} dests={data.dests} income={data.incomePaise} selected={sel?.id} onSelect={setSel} memo={data.cardPayments} />
        ) : view === "pie" ? (
          <Pie flows={data.dests} selected={sel?.id} onSelect={setSel} />
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
          {([["income", "Income"], ["spend", "Spending"], ["discretionary", "Discretionary"], ["invest", "Invested"], ...(data.cardPayments ? [["card", "Card bills paid"] as const] : [])] as const).map(([t, l]) => (
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
            <div className="mt-2 text-[12px] text-muted">{sel.tone === "card" ? "Paid toward card bills; the purchases are already in spending" : `${pct(sel.paise, data.incomePaise)} of income`} · {sel.count} transaction{sel.count === 1 ? "" : "s"}</div>
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
