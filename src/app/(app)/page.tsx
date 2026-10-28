"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Bank, Calendar, CalendarCheck, CalendarDots, ChartLineUp, Gauge, HandCoins, PiggyBank, Sparkle, SquaresFour, Timer, TrendUp, Wallet } from "@phosphor-icons/react";
import { Button } from "@/components/atoms";
import { Card, Meter, PanelSkeleton, StatCard, StatSkeleton, Tabs } from "@/components/molecules";
import { AccountBalances, CashflowPanel, NetWorthChart, RecentActivity, SpendingHeatmap } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { type PeriodKey, fetchAdvice, useAccounts, useDashboard } from "@/lib/api";
import { inr } from "@/lib/money";

const PERIODS: { value: PeriodKey; label: string }[] = [
  { value: "month", label: "This month" }, { value: "last", label: "Last month" }, { value: "3m", label: "3 months" }, { value: "custom", label: "Custom" },
];
const pct = (r: number) => `${r >= 0 ? "+" : ""}${(r * 100).toFixed(1)}%`;
const Section = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
  <section className="mt-9">
    <div className="mb-3 flex items-center gap-3"><span className="num text-[11px] font-semibold text-faint">{n}</span><h2 className="text-[13px] font-semibold tracking-tight">{title}</h2><span className="h-px flex-1 bg-line" /></div>
    {children}
  </section>
);

/** Renders what the backend's dashboard module computes; no financial logic lives here. */
export default function Dashboard() {
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const dash = useDashboard(period, custom.from, custom.to), accounts = useAccounts();
  const [advice, setAdvice] = useState<{ text?: string; busy?: boolean; error?: string }>({});

  const d = dash.data;
  const customIncomplete = period === "custom" && (!custom.from || !custom.to);

  async function ask() {
    setAdvice({ busy: true });
    try { setAdvice({ text: (await fetchAdvice(period, custom.from, custom.to)).advice }); } catch (e) { setAdvice({ error: e instanceof Error ? e.message : "Could not get advice" }); }
  }

  const action = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {period === "custom" && (
        <>
          <input type="date" aria-label="From" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className="h-9 border border-line px-2 text-[13px]" />
          <input type="date" aria-label="To" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className="h-9 border border-line px-2 text-[13px]" />
        </>
      )}
      <Tabs<PeriodKey> value={period} items={PERIODS} onChange={setPeriod} />
    </div>
  );

  if (!d) {
    return (
      <PageLayout title="Dashboard" icon={SquaresFour} action={action} error={dash.error}>
        {customIncomplete ? <p className="text-[13px] text-muted">Pick a start and end date.</p> : (
          <>
            <Section n="01" title="Financial position"><div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <StatSkeleton key={i} />)}</div></Section>
            <Section n="02" title="Net-worth trajectory"><PanelSkeleton /></Section>
            <Section n="03" title="Cash flow"><div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <StatSkeleton key={i} />)}</div></Section>
          </>
        )}
      </PageLayout>
    );
  }

  const { position: p, cashflow: c, upcoming: u } = d;
  const pnlTone = p.pnlPaise > 0 ? "good" : p.pnlPaise < 0 ? "bad" : "info";
  const netTone = c.netPaise > 0 ? "good" : c.netPaise < 0 ? "bad" : "neutral";
  const A = accounts.data ?? [];

  return (
    <PageLayout title="Dashboard" icon={SquaresFour} action={action} error={dash.error || accounts.error}>
      {d.needsProfile && (
        <Link href="/profile" className="mb-2 block border border-warn bg-warn-bg px-5 py-3 text-[13px] text-warn">
          Tell Catalyst about your salary, SIPs and investments to unlock runway, daily target and portfolio. Set up About Me →
        </Link>
      )}

      <Section n="01" title="Financial position">
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          <StatCard label="Net Worth" icon={Wallet} href="/profile" value={inr(p.netWorthPaise)}
            sub={`${inr(p.cashPaise)} cash · ${inr(p.currentPaise)} invested`} />
          <StatCard label="Cash" icon={Bank} href="/accounts" value={inr(p.cashPaise)} sub={`Across ${p.accounts} account${p.accounts === 1 ? "" : "s"}`} />
          <StatCard label="Investments" icon={ChartLineUp} href={p.usesFunds ? "/funds" : "/profile"} value={inr(p.currentPaise)} tone={pnlTone}
            sub={p.investedPaise > 0 ? `${inr(p.investedPaise)} invested · ${p.pnlPaise >= 0 ? "+" : ""}${inr(p.pnlPaise)} (${pct(p.pnlPaise / p.investedPaise)})` : "Add holdings in About Me"} />
          <StatCard label="Owed" icon={HandCoins} href="/emis" tone={p.liabilitiesPaise > 0 ? "warn" : "neutral"} value={inr(p.liabilitiesPaise)} sub="Outstanding EMIs and loans. Not deducted from net worth" />
          <StatCard label="Since Last Month" icon={TrendUp} tone={p.netWorthChangePaise === undefined ? "neutral" : p.netWorthChangePaise >= 0 ? "good" : "bad"}
            value={p.netWorthChangePaise === undefined ? "–" : `${p.netWorthChangePaise >= 0 ? "+" : ""}${inr(p.netWorthChangePaise)}`}
            sub={p.netWorthChangeSince ? `Net worth vs ${new Date(`${p.netWorthChangeSince}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}` : "No month-end recorded yet"} />
        </div>
      </Section>

      <Section n="02" title="Net-worth trajectory">
        <NetWorthChart />
        <Card title="Catalyst AI" icon={Sparkle} className="mt-4" action={<Button size="sm" variant="ghost" loading={advice.busy} onClick={ask}>{advice.text ? "Ask again" : "Get advice"}</Button>}>
          {advice.text ? <p className="whitespace-pre-line text-[13px] text-sub">{advice.text}</p>
            : advice.error ? <p className="text-[13px] text-loss">{advice.error}</p>
            : <p className="text-[13px] text-muted">A short read of this period&apos;s numbers and what you told Catalyst about yourself.</p>}
        </Card>
      </Section>

      <Section n="03" title="Cash flow">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard label="Income" icon={ArrowDownLeft} tone={c.incomePaise > 0 ? "good" : "neutral"} value={inr(c.incomePaise)} sub="Credits typed as income. Transfers and refunds excluded" />
          <StatCard label="Expenses" icon={ArrowUpRight} value={inr(c.spentPaise)} sub={c.earlierSpentPaise > 0 ? `Incl. ${inr(c.earlierSpentPaise)} before Catalyst` : "Excludes transfers and investments"} />
          <StatCard label="Invested & Saved" icon={PiggyBank} tone="info" value={inr(c.investedPaise)} sub="Categories named like SIP or investment" />
          <StatCard label="Net Cash" icon={Wallet} tone={netTone} value={`${c.netPaise > 0 ? "+" : ""}${inr(c.netPaise)}`}
            sub={c.savingsRate === undefined ? "No income in this period" : `Savings rate ${Math.round(c.savingsRate * 100)}% = (income − expenses) ÷ income`} />
        </div>
        <div className="mt-4"><CashflowPanel cashflow={c} loading={false} /></div>
      </Section>

      <Section n="04" title="Upcoming commitments">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Next Salary" icon={CalendarCheck} href="/profile" tone={u.salaryPaise > 0 ? "good" : "neutral"} value={u.salaryPaise > 0 ? `${u.daysToSalary} days` : "–"}
            sub={u.salaryPaise > 0 ? `${inr(u.salaryPaise)} expected on the ${u.salaryDay}th. Change in About Me` : "Set salary in About Me"} />
          <StatCard label="SIPs" icon={ChartLineUp} href="/funds" tone={u.nextSip && u.nextSip.days <= 3 ? "warn" : "info"} value={u.sipMonthlyPaise > 0 ? `${inr(u.sipMonthlyPaise)} / mo` : "–"}
            sub={u.nextSip ? `Next: ${u.nextSip.name} in ${u.nextSip.days} day${u.nextSip.days === 1 ? "" : "s"}` : "Add SIPs on the Mutual Funds page"} />
          <StatCard label="EMIs" icon={Calendar} href="/emis" tone={u.emiTone} value={u.emiActive ? `${inr(u.emiMonthlyPaise)} / mo` : "–"}
            sub={u.emiActive ? `${u.emiActive} active · ${inr(u.emiOutstandingPaise)} outstanding${u.nextEmi ? ` · next in ${u.nextEmi.days}d` : ""}` : "Add loans on the EMIs page"}>
            {u.emiShare > 0 && <Meter ratio={u.emiShare} tone={u.emiTone} />}
          </StatCard>
          <StatCard label="Mandates · 90 days" icon={CalendarDots} href="/mandates" tone={d.mandates.due.length ? "warn" : "neutral"} value={d.mandates.due.length ? inr(d.mandates.next90Paise) : "–"}
            sub={d.mandates.due.length ? `${d.mandates.due.slice(0, 3).map((o) => `${o.name} in ${o.days}d`).join(" · ")}${d.mandates.due.length > 3 ? ` · +${d.mandates.due.length - 3} more` : ""}` : "Add insurance, fees and other must-pay items"} />
          <StatCard label="Runway" icon={Timer} tone={u.runwayTone} value={u.runwayDays === undefined ? "Sustainable" : `~${u.runwayDays} days`}
            sub={u.runwayDays === undefined ? `Income covers outgoings (${inr(u.monthlyNetPaise)} / month net)` : `${inr(p.cashPaise)} cash ÷ ${inr(u.monthlyBurnPaise)} net burn a month`} />
          <StatCard label="Today's Budget" icon={Gauge} tone={u.dailyTone} value={u.dailyTargetPaise > 0 ? inr(u.dailyTargetPaise) : "–"}
            sub={u.dailyTargetPaise > 0 ? `Spent ${inr(u.todaySpentPaise)} today. (Cash − buffer − EMIs and SIPs due) ÷ ${u.daysToSalary} days to salary` : "Set salary and buffer in About Me"}>
            {u.dailyTargetPaise > 0 && <Meter ratio={u.todaySpentPaise / u.dailyTargetPaise} tone={u.dailyTone} />}
          </StatCard>
        </div>
      </Section>

      <Section n="05" title="Activity">
        <div className="grid gap-4 xl:grid-cols-3">
          <RecentActivity txns={d.recent} className="xl:col-span-2" />
          <AccountBalances accounts={A} />
        </div>
      </Section>

      <Section n="06" title="Daily spending">
        <SpendingHeatmap />
      </Section>
    </PageLayout>
  );
}
