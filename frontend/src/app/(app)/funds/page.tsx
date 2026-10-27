"use client";

import { useState } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, ArrowsClockwise, Bank, CaretRight, ChartPie, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/atoms";
import { Card, Donut, EmptyState, Modal, RowSkeleton, StatCard, StatSkeleton, Tabs } from "@/components/molecules";
import { FundForm } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { api, type FundInput, type FundType, type FundView, type Sip, type SipStatus, useAccounts, useAct, useFunds } from "@/lib/api";
import { cn } from "@/lib/cn";
import { inr } from "@/lib/money";

const rs = (n: number) => inr(Math.round(n * 100));
const pct = (r: number) => `${r >= 0 ? "+" : ""}${(r * 100).toFixed(1)}%`;
const chip = (n: number) => (n > 0 ? "bg-gain-bg text-gain" : n < 0 ? "bg-loss-bg text-loss" : "bg-tint text-muted");
const edge = (n: number) => (n > 0 ? "border-l-gain" : n < 0 ? "border-l-loss" : "border-l-line");
const SIP_TONE: Record<SipStatus, string> = { active: "bg-gain-bg text-gain", paused: "bg-warn/10 text-warn", cancelled: "bg-loss-bg text-loss" };
const sipStatus = (f: FundView): SipStatus => f.sip?.status ?? "active";
/** The PUT body for a fund, optionally with a different SIP (status changes reuse the full update). */
const toInput = (f: FundView, sip: Sip | undefined = f.sip): FundInput => ({ code: f.code, platform: f.platform, accountId: f.accountId, type: f.type, membership: f.membership, units: f.units, avgNav: f.avgNav, invested: f.invested, sip });
type Filter = "All" | FundType;
const FILTERS: { value: Filter; label: string }[] = (["All", "Equity", "Debt", "Metal", "Foreign"] as const).map((v) => ({ value: v, label: v }));

export default function Funds() {
  const q = useFunds();
  const act = useAct();
  const busy = useIsMutating() > 0;
  const bankOf = new Map((useAccounts().data ?? []).map((a) => [a.id, `${a.bank} · ${a.name}${a.last4 ? ` ••${a.last4}` : ""}`]));
  const [filter, setFilter] = useState<Filter>("All");
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<FundView | null | undefined>(undefined); // undefined closed, null adding
  const [refreshing, setRefreshing] = useState(false);

  const all = q.data?.items ?? [], s = q.data?.summary;
  const sel = all.find((f) => f.id === open);
  const funds = filter === "All" ? all : all.filter((f) => f.type === filter);

  const save = (input: FundInput) =>
    act(() => (form ? api(`/funds/${form.id}`, { method: "PUT", body: input }) : api("/funds", { method: "POST", body: input })), { ok: form ? "Fund updated" : "Fund added", onDone: () => setForm(undefined) });

  return (
    <PageLayout title="Mutual Funds" icon={ChartPie} error={q.error} action={
      <div className="flex gap-2">
        <Button variant="ghost" icon={ArrowsClockwise} loading={refreshing} disabled={all.length === 0} onClick={() => { setRefreshing(true); act(() => api("/funds/refresh", { method: "POST" }), { ok: "NAVs refreshed", onSettled: () => setRefreshing(false) }); }}>Refresh NAV</Button>
        <Button icon={Plus} disabled={!q.isSuccess} onClick={() => setForm(null)}>Add fund</Button>
      </div>
    }>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {q.isLoading ? [0, 1, 2, 3].map((i) => <StatSkeleton key={i} />) : <>
        <StatCard label="Current Value" value={rs(s?.value ?? 0)} sub={s?.asOf ? `NAV as of ${s.asOf}` : "Add a fund to start"} />
        <StatCard label="Invested" value={rs(s?.invested ?? 0)} sub={`${s?.count ?? 0} fund${s?.count === 1 ? "" : "s"}`} />
        <StatCard label="Returns" value={`${(s?.pnl ?? 0) >= 0 ? "+" : ""}${rs(s?.pnl ?? 0)}`} tone={(s?.pnl ?? 0) > 0 ? "good" : (s?.pnl ?? 0) < 0 ? "bad" : "neutral"} sub={s && s.invested > 0 ? pct(s.pnl / s.invested) : undefined} />
        <StatCard label="Monthly SIP" value={rs(s?.sipMonthly ?? 0)} tone={s?.nextSip && s.nextSip.days <= 3 ? "warn" : "neutral"} sub={s?.nextSip ? `Next: ${s.nextSip.name} in ${s.nextSip.days} day${s.nextSip.days === 1 ? "" : "s"}` : "No SIPs set"} />
        </>}
      </div>

      {s && s.count > 0 && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card title="By Fund Type"><Donut label="Allocation by fund type" slices={s.byType} /></Card>
          <Card title="By Platform"><Donut label="Allocation by platform" slices={s.byPlatform} /></Card>
        </div>
      )}

      <div className="mt-6 mb-3"><Tabs<Filter> value={filter} items={FILTERS} onChange={setFilter} /></div>

      <div className="space-y-3">
        {q.isLoading ? (
          <><RowSkeleton /><RowSkeleton /></>
        ) : all.length === 0 ? (
          <div className="border border-line py-10">
            <EmptyState icon={ChartPie}>Add a fund by its scheme code to track its value, returns and SIP.</EmptyState>
            <div className="mt-4 flex justify-center"><Button icon={Plus} onClick={() => setForm(null)}>Add your first fund</Button></div>
          </div>
        ) : funds.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-muted">No {filter} funds.</p>
        ) : funds.map((f) => {
          return (
            <div key={f.id} className={cn("border border-l-4 border-line bg-white", edge(f.pnl))}>
              <button type="button" aria-haspopup="dialog" onClick={() => setOpen(f.id)} className="flex w-full items-start gap-4 p-5 text-left">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="truncate font-medium">{f.name}</span><CaretRight size={14} className="shrink-0 text-muted" /></div>
                  <div className="mt-1 text-[12px] text-muted">{f.type} · {f.platform} · {f.membership}</div>
                  {f.sip && <span className={cn("mt-2 inline-block px-1.5 py-0.5 text-[11px] font-medium capitalize", SIP_TONE[sipStatus(f)])}>SIP {sipStatus(f)}</span>}
                </div>
                <div className="text-right">
                  <div className="num text-[20px] font-light leading-none">{rs(f.value)}</div>
                  <div className={cn("num mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 text-[12px] font-medium", chip(f.pnl))}>
                    {f.pnl > 0 ? <ArrowUpRight size={12} weight="bold" /> : f.pnl < 0 ? <ArrowDownRight size={12} weight="bold" /> : null}
                    {f.pnl >= 0 ? "+" : ""}{rs(f.pnl)}{f.returnPct !== undefined && ` (${pct(f.returnPct)})`}
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {sel && (() => {
        const f = sel;
        return (
          <Modal title={f.name} wide onClose={() => setOpen(null)}>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div><div className="num text-[28px] font-light leading-none">{rs(f.value)}</div><div className="mt-1 text-[12px] text-muted">{f.type} · {f.platform} · {f.membership}</div></div>
              <div className={cn("num inline-flex items-center gap-1 px-2 py-1 text-[13px] font-medium", chip(f.pnl))}>{f.pnl > 0 ? <ArrowUpRight size={13} weight="bold" /> : f.pnl < 0 ? <ArrowDownRight size={13} weight="bold" /> : null}{f.pnl >= 0 ? "+" : ""}{rs(f.pnl)}{f.returnPct !== undefined && ` (${pct(f.returnPct)})`}</div>
            </div>
                <div className="grid gap-6 text-[13px] md:grid-cols-2">
                  <dl className="space-y-1">
                    {([["Scheme code", String(f.code)], ["Fund house", f.fundHouse ?? "–"], ["Units", f.units.toFixed(3)], ["Avg NAV", `₹${f.avgNav.toFixed(4)}`], ["Latest NAV", f.nav ? `₹${f.nav} (${f.navDate})` : "Not fetched"], ["Invested", rs(f.invested)], ["Bank account", f.accountId ? bankOf.get(f.accountId) ?? "–" : "Not set"]] as const).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="num text-right">{v}</dd></div>
                    ))}
                  </dl>
                  <div>
                    <div className="eyebrow mb-2">SIP</div>
                    {f.sip ? (() => {
                      const st = sipStatus(f), sip = f.sip;
                      const setSip = (status: SipStatus, ok: string) => act(() => api(`/funds/${f.id}`, { method: "PUT", body: toInput(f, { ...sip, status }) }), { ok });
                      return (
                        <>
                          <p className="flex items-center gap-2">{rs(sip.amount)} on the {sip.day}th{st === "active" && ` · next in ${f.sipInDays} day${f.sipInDays === 1 ? "" : "s"}`}<span className={cn("px-1.5 py-0.5 text-[11px] font-medium capitalize", SIP_TONE[st])}>{st}</span></p>
                          {f.accountId && <p className="mt-1 flex items-center gap-1 text-[12px] text-muted"><Bank size={13} />Debits {bankOf.get(f.accountId) ?? "linked account"}</p>}
                          {st === "active" && <p className="mt-1 text-[12px] text-muted">When the instalment is debited, record it to add units at the latest NAV{f.nav ? ` (≈ ${(sip.amount / f.nav).toFixed(3)} units)` : ""}. Your broker&apos;s allotment may differ slightly.</p>}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {st === "active" && <Button size="sm" loading={busy} disabled={!f.nav} onClick={() => act(() => api(`/funds/${f.id}/sip`, { method: "POST" }), { ok: "SIP instalment recorded" })}>Record SIP instalment</Button>}
                            {st === "active" && <Button size="sm" variant="ghost" disabled={busy} onClick={() => setSip("paused", "SIP paused")}>Pause</Button>}
                            {st !== "active" && <Button size="sm" loading={busy} onClick={() => setSip("active", "SIP resumed")}>{st === "paused" ? "Resume" : "Restart"}</Button>}
                            {st !== "cancelled" && <Button size="sm" variant="ghost" onClick={() => window.confirm("Cancel this SIP? You can restart it later.") && setSip("cancelled", "SIP cancelled")}>Cancel SIP</Button>}
                          </div>
                        </>
                      );
                    })() : <p className="text-muted">No SIP set. Add one with Edit.</p>}
                    <div className="mt-5 flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => { setOpen(null); setForm(f); }}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => window.confirm(`Remove ${f.name}?`) && act(() => api(`/funds/${f.id}`, { method: "DELETE" }), { ok: "Fund removed" })}>Remove</Button>
                    </div>
                  </div>
                </div>
          </Modal>
        );
      })()}

      {form !== undefined && <FundForm key={form?.id ?? "new"} initial={form ?? undefined} onSave={save} onClose={() => setForm(undefined)} />}
    </PageLayout>
  );
}
