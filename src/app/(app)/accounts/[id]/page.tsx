"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Bank, ChartLineUp, Info, ListMagnifyingGlass, Repeat, Storefront, Tag, Warning } from "@phosphor-icons/react";
import { BankLogo } from "@/components/atoms";
import { BarRow, Card, EmptyState, RowSkeleton, StatCard, StatSkeleton, Tabs } from "@/components/molecules";
import { EditAccount, TransactionsTable } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { useAccount, useAccountTxns, useAccounts, useCards, useCategories } from "@/lib/api";
import { bankName } from "@/lib/banks";
import { shortDate } from "@/lib/dates";
import { inr } from "@/lib/money";
import { isDebit } from "@/lib/txn";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
type Filter = "all" | "in" | "out";
const FILTERS: { value: Filter; label: string }[] = [{ value: "all", label: "All" }, { value: "in", label: "Money in" }, { value: "out", label: "Money out" }];

/** Balance over the last 30 days. The line is stretched between the lowest and highest balance so small moves stay visible. */
function BalanceLine({ series }: { series: { date: string; paise: number }[] }) {
  const lo = Math.min(...series.map((p) => p.paise)), hi = Math.max(...series.map((p) => p.paise)), span = Math.max(hi - lo, 1);
  const pts = series.map((p, i) => `${(i / Math.max(series.length - 1, 1)) * 100},${36 - ((p.paise - lo) / span) * 32}`);
  const first = series[0], last = series[series.length - 1];
  return (
    <div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="Balance over the last 30 days" className="h-36 w-full">
        <polygon points={`0,40 ${pts.join(" ")} 100,40`} fill="var(--color-ink)" opacity="0.07" />
        <polyline points={pts.join(" ")} fill="none" stroke="var(--color-ink)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-muted"><span>{shortDate(first.date)}</span><span className="num">Low {inr(lo)} · High {inr(hi)}</span><span>{shortDate(last.date)}</span></div>
    </div>
  );
}

export default function AccountPage() {
  const { id } = useParams<{ id: string }>();
  const q = useAccount(id), txq = useAccountTxns(id);
  const accounts = useAccounts().data ?? [], cards = useCards().data ?? [], categories = useCategories().data ?? [];
  const [filter, setFilter] = useState<Filter>("all");
  const a = q.data;
  const txns = (txq.data ?? []).filter((t) => filter === "all" || (filter === "in" ? isDebit(t) === false : isDebit(t) === true));
  const catName = (cid?: string) => (cid ? categories.find((c) => c.id === cid)?.name ?? "Category" : "Uncategorised");
  const spend = (a?.by_category ?? []).reduce((t, c) => t + c.paise, 0);
  const topPayee = Math.max(...(a?.top_payees ?? []).map((p) => p.paise), 1);

  return (
    <PageLayout title={a?.name ?? "Account"} icon={Bank} description={a ? bankName(a.bank) : undefined} error={q.error} action={a && <EditAccount a={a} />}>
      <Link href="/accounts" className="-mt-4 mb-5 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted hover:text-ink"><ArrowLeft size={13} weight="bold" />All accounts</Link>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {!a ? [0, 1, 2, 3].map((i) => <StatSkeleton key={i} />) : <>
          <StatCard label="Balance" icon={Bank} value={inr(a.balance_paise)} sub={`Opened with ${inr(a.opening_balance_paise)} on ${shortDate(a.opening_at)}`} />
          <StatCard label="Money In" icon={ArrowDownLeft} tone="good" value={inr(a.in_paise)} sub="So far this month" />
          <StatCard label="Money Out" icon={ArrowUpRight} tone={a.out_paise > 0 ? "bad" : "neutral"} value={inr(a.out_paise)} sub={`${a.month_txns} transaction${a.month_txns === 1 ? "" : "s"} this month`} />
          <StatCard label="Monthly SIPs" icon={Repeat} value={inr(Math.round(a.sip_monthly * 100))} sub={a.sips.length ? `${a.sips.length} SIP${a.sips.length === 1 ? "" : "s"} debit this account` : "None linked"} />
        </>}
      </div>

      {a && a.needs_review > 0 && (
        <p className="mt-4 flex items-center gap-2 bg-warn-bg px-4 py-2.5 text-[13px] text-warn"><Warning size={16} weight="bold" /><span><span className="font-semibold">{a.needs_review} transaction{a.needs_review === 1 ? "" : "s"}</span> from this account need a category. File them below.</span></p>
      )}

      {a && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[3fr_2fr]">
          <Card title="Balance, last 30 days" icon={ChartLineUp}><BalanceLine series={a.series} /></Card>
          <Card title="Top payees · 30 days" icon={Storefront}>
            {a.top_payees.length === 0 ? <EmptyState icon={Storefront}>No spending yet</EmptyState> : (
              <div className="space-y-3.5 text-[13px]">{a.top_payees.map((p) => <BarRow key={p.name} label={`${p.name} · ${p.count}×`} value={inr(p.paise)} ratio={p.paise / topPayee} />)}</div>
            )}
          </Card>
          <Card title="Spending by category · 30 days" icon={Tag}>
            {a.by_category.length === 0 ? <EmptyState icon={Tag}>No spending yet</EmptyState> : (
              <div className="space-y-3.5 text-[13px]">{a.by_category.slice(0, 6).map((c) => <BarRow key={c.category_id ?? "none"} label={catName(c.category_id)} value={inr(c.paise)} ratio={spend > 0 ? c.paise / spend : 0} />)}</div>
            )}
          </Card>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Card title="Linked SIPs" icon={Repeat}>
              {a.sips.length === 0 ? <p className="text-[13px] text-muted">No SIP debits this account. Pick it as the bank account when adding a fund.</p> : (
                <ul className="divide-y divide-line-soft text-[13px]">
                  {a.sips.map((s) => (
                    <li key={s.name} className="flex items-center justify-between gap-3 py-2"><span className="min-w-0"><span className="block truncate font-medium">{s.name}</span><span className="text-[12px] text-muted">{s.day}th · in {s.inDays} day{s.inDays === 1 ? "" : "s"}</span></span><span className="num font-semibold">{inr(Math.round(s.amount * 100))}</span></li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Account details" icon={Info}>
              <dl className="space-y-2 text-[13px]">
                {([["Bank", bankName(a.bank)], ["SMS matched on", `ending ${a.last4}`], ["Opening balance", inr(a.opening_balance_paise)], ["Balance as of", day(a.opening_at)], ["Transactions since", String(a.total_txns)], ["Added on", day(a.created_at)]] as const).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="num text-right font-medium">{v}</dd></div>
                ))}
              </dl>
            </Card>
          </div>
        </div>
      )}

      <div className="mt-8 mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">{a && <BankLogo bank={a.bank} className="size-7" />}<ListMagnifyingGlass size={16} className="text-muted" />Transactions</h2>
        <Tabs<Filter> value={filter} items={FILTERS} onChange={setFilter} />
      </div>
      {txq.isLoading ? <RowSkeleton /> : (
        <TransactionsTable txns={txns} accounts={accounts} cards={cards} categories={categories} emptyText={filter === "all" ? "No transactions on this account yet" : `No ${filter === "in" ? "money in" : "money out"} transactions`} />
      )}
      {(txq.data?.length ?? 0) >= 200 && <p className="mt-3 text-center text-[12px] text-muted">Showing the latest 200 transactions.</p>}
    </PageLayout>
  );
}
