"use client";

import { useState } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, ArrowsClockwise, ArrowsLeftRight, Bank, CaretDown, ChartPie, ClockCounterClockwise, Lightning, MagnifyingGlass, Plus, Repeat, SignIn, SignOut, Stack } from "@phosphor-icons/react";
import { Button, Input, Select } from "@/components/atoms";
import { Card, Donut, EmptyState, Modal, RowSkeleton, SectionTitle, StatCard, StatSkeleton, Tabs } from "@/components/molecules";
import { ExitedRow, FundForm, FundListHeader, FundRow, GeniusSipDialog, RebalanceDialog, SIP_TONE, chip, pct, rs, sipStatus, type Exit } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { api, type FundInput, type FundType, type FundView, type GeniusSip, type Sip, type SipStatus, useAccounts, useAct, useFunds } from "@/lib/api";
import { bankName } from "@/lib/banks";
import { cn } from "@/lib/cn";

/** The PUT body for a fund, optionally with a different SIP (status changes reuse the full update). */
const toInput = (f: FundView, sip: Sip | undefined = f.sip): FundInput => ({ code: f.code, platform: f.platform, accountId: f.accountId, type: f.type, membership: f.membership, units: f.units, avgNav: f.avgNav, invested: f.invested, sip });
type Filter = "All" | FundType;
const FILTERS: { value: Filter; label: string }[] = (["All", "Equity", "Debt", "Metal", "Foreign"] as const).map((v) => ({ value: v, label: v }));
type SortKey = "value" | "returns" | "invested" | "name";
const SORTS: Record<SortKey, (a: FundView, b: FundView) => number> = {
  value: (a, b) => b.value - a.value,
  returns: (a, b) => (b.returnPct ?? -Infinity) - (a.returnPct ?? -Infinity),
  invested: (a, b) => b.invested - a.invested,
  name: (a, b) => a.name.localeCompare(b.name),
};
const DARK_BTN = "inline-flex h-8 items-center gap-1.5 px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const DARK_GHOST = "border border-white/25 text-white hover:bg-white/10";
const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
const shortDay = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** A group's title bar with its subtotal, so a long list reads as two or three short ones. */
function GroupBar({ icon: Icon, title, sub, funds }: { icon: typeof Stack; title: string; sub: string; funds: FundView[] }) {
  const value = funds.reduce((t, f) => t + f.value, 0), invested = funds.reduce((t, f) => t + f.invested, 0), pnl = value - invested;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line bg-tint px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2"><Icon size={16} weight="duotone" className="shrink-0 text-sub" /><span className="text-[13px] font-semibold">{title}</span><span className="truncate text-[12px] text-muted">{funds.length} fund{funds.length === 1 ? "" : "s"} · {sub}</span></div>
      <div className="flex shrink-0 items-center gap-2"><span className="num text-[13px] font-semibold">{rs(value)}</span><span className={cn("num px-1.5 py-0.5 text-[11px] font-semibold", chip(pnl))}>{invested > 0 ? pct(pnl / invested) : "–"}</span></div>
    </div>
  );
}

export default function Funds() {
  const q = useFunds();
  const act = useAct();
  const busy = useIsMutating() > 0;
  const bankOf = new Map((useAccounts().data ?? []).map((a) => [a.id, `${bankName(a.bank)} · ${a.name}`]));
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("value");
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<FundView | null | undefined>(undefined); // undefined closed, null adding
  const [incoming, setIncoming] = useState(false); // the add form was opened from a rebalance
  const [rebalance, setRebalance] = useState<string[] | null>(null); // fund ids ticked when it opened
  const [refreshing, setRefreshing] = useState(false);
  const [sipDialog, setSipDialog] = useState(false);
  const [acting, setActing] = useState(false);

  const items = q.data?.items ?? [], s = q.data?.summary, g = s?.genius;
  const sel = items.find((f) => f.id === open);
  const needle = query.trim().toLowerCase();
  const shown = items.filter((f) => (filter === "All" || f.type === filter) && (!needle || [f.name, f.fundHouse, f.platform].some((x) => x?.toLowerCase().includes(needle))));
  const live = shown.filter((f) => f.active).sort(SORTS[sort]), gone = shown.filter((f) => !f.active);
  const groups = [
    { key: "Genius", icon: Lightning, title: "Genius basket", sub: "ET Money, rebalanced monthly", funds: live.filter((f) => f.membership === "Genius") },
    { key: "Standalone", icon: Stack, title: "Standalone", sub: "bought on your own", funds: live.filter((f) => f.membership !== "Genius") },
  ].filter((x) => x.funds.length > 0);
  const geniusLive = items.filter((f) => f.active && f.membership === "Genius");
  const lastMove = g?.lastRebalance ? daysSince(g.lastRebalance) : undefined;

  const save = (input: FundInput) =>
    act(() => (form ? api(`/funds/${form.id}`, { method: "PUT", body: input }) : api("/funds", { method: "POST", body: input })), { ok: form ? "Fund updated" : "Fund added", onDone: () => { setForm(undefined); setIncoming(false); } });
  const saveGeniusSip = (sip: GeniusSip) => {
    setActing(true);
    act(() => api("/funds/genius/sip", { method: "PUT", body: sip }), { ok: "Genius SIP saved", onDone: () => setSipDialog(false), onSettled: () => setActing(false) });
  };
  const moveOut = (exits: Exit[]) => {
    setActing(true);
    act(() => Promise.all(exits.map((x) => api(`/funds/${x.id}/exit`, { method: "POST", body: { date: x.date, proceeds: x.proceeds } }))),
      { ok: `${exits.length} fund${exits.length === 1 ? "" : "s"} moved out`, onDone: () => { setRebalance(null); setOpen(null); }, onSettled: () => setActing(false) });
  };

  return (
    <PageLayout title="Mutual Funds" icon={ChartPie} error={q.error} action={
      <div className="flex gap-2">
        <Button variant="ghost" icon={ArrowsClockwise} loading={refreshing} disabled={items.length === 0} onClick={() => { setRefreshing(true); act(() => api("/funds/refresh", { method: "POST" }), { ok: "NAVs refreshed", onSettled: () => setRefreshing(false) }); }}>Refresh NAV</Button>
        <Button icon={Plus} disabled={!q.isSuccess} onClick={() => setForm(null)}>Add fund</Button>
      </div>
    }>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {q.isLoading ? [0, 1, 2, 3].map((i) => <StatSkeleton key={i} />) : <>
        <StatCard label="Current Value" value={rs(s?.value ?? 0)} sub={s?.asOf ? `NAV as of ${s.asOf}` : "Add a fund to start"} />
        <StatCard label="Invested" value={rs(s?.invested ?? 0)} sub={`${s?.count ?? 0} active fund${s?.count === 1 ? "" : "s"}`} />
        <StatCard label="Returns" value={`${(s?.pnl ?? 0) >= 0 ? "+" : ""}${rs(s?.pnl ?? 0)}`} tone={(s?.pnl ?? 0) > 0 ? "good" : (s?.pnl ?? 0) < 0 ? "bad" : "neutral"} sub={s && s.invested > 0 ? `${pct(s.pnl / s.invested)}${s.exited > 0 ? ` · ${s.realised >= 0 ? "+" : ""}${rs(s.realised)} booked` : ""}` : undefined} />
        <StatCard label="Monthly SIP" value={rs(s?.sipMonthly ?? 0)} tone={s?.nextSip && s.nextSip.days <= 3 ? "warn" : "neutral"} sub={s?.nextSip ? `Next: ${s.nextSip.name} in ${s.nextSip.days} day${s.nextSip.days === 1 ? "" : "s"}` : "No SIPs set"} />
        </>}
      </div>

      {s && s.count > 0 && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card title="By Fund Type"><Donut label="Allocation by fund type" slices={s.byType} /></Card>
          <Card title="By Platform"><Donut label="Allocation by platform" slices={s.byPlatform} /></Card>
        </div>
      )}

      {g && g.active + g.exited > 0 && (
        <section className="mt-4 bg-black p-5 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-md bg-green-400/15 text-green-400"><Lightning size={18} weight="fill" /></span>
              <div><h2 className="text-[16px] font-semibold leading-tight tracking-tight">Genius basket</h2><p className="text-[12px] text-white/60">ET Money · rebalanced monthly</p></div>
            </div>
            <button type="button" onClick={() => setRebalance([])} className={cn(DARK_BTN, "bg-green-400 text-black hover:bg-green-300")}><ArrowsLeftRight size={13} />Rebalance</button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            {([["In the basket", `${g.active} fund${g.active === 1 ? "" : "s"}`, 0], ["Value", rs(g.value), 0], ["Returns", `${g.pnl >= 0 ? "+" : ""}${rs(g.pnl)}`, g.pnl], ["Booked on exits", `${g.realised >= 0 ? "+" : ""}${rs(g.realised)}`, g.realised]] as const).map(([k, v, n]) => (
              <div key={k}><div className="text-[11px] font-medium text-white/60">{k}</div><div className={cn("num mt-1 text-[20px] font-semibold leading-none", n > 0 ? "text-green-400" : n < 0 ? "text-red-400" : "text-white")}>{v}</div></div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/10 pt-4 text-[13px]">
            <Repeat size={15} className="text-green-400" />
            {g.sip ? (() => {
              const sip = g.sip, st = sip.status ?? "active";
              const setStatus = (status: SipStatus, ok: string) => act(() => api("/funds/genius/sip", { method: "PUT", body: { ...sip, status } }), { ok });
              return (
                <>
                  <span className="font-semibold">Basket SIP {rs(sip.amount)}</span>
                  <span className="text-white/60">on the {sip.day}th{st === "active" && g.sipInDays !== undefined && ` · next in ${g.sipInDays} day${g.sipInDays === 1 ? "" : "s"}`}</span>
                  <span className={cn("px-1.5 py-0.5 text-[11px] font-semibold capitalize", st === "active" ? "bg-green-400/15 text-green-400" : st === "paused" ? "bg-amber-400/15 text-amber-400" : "bg-red-400/15 text-red-400")}>{st}</span>
                  <span className="ml-auto flex flex-wrap gap-2">
                    {st === "active" && <button type="button" disabled={busy || g.active === 0} onClick={() => act(() => api("/funds/genius/sip", { method: "POST" }), { ok: "Basket instalment recorded across your Genius funds" })} className={cn(DARK_BTN, "bg-green-400 text-black hover:bg-green-300")}>Record instalment</button>}
                    {st === "active" ? <button type="button" disabled={busy} onClick={() => setStatus("paused", "Genius SIP paused")} className={cn(DARK_BTN, DARK_GHOST)}>Pause</button> : <button type="button" disabled={busy} onClick={() => setStatus("active", "Genius SIP resumed")} className={cn(DARK_BTN, "bg-green-400 text-black hover:bg-green-300")}>Resume</button>}
                    <button type="button" onClick={() => setSipDialog(true)} className={cn(DARK_BTN, DARK_GHOST)}>Edit</button>
                  </span>
                </>
              );
            })() : (
              <>
                <span className="text-white/60">No basket SIP set. One amount covers every Genius fund, however many there are.</span>
                <button type="button" onClick={() => setSipDialog(true)} className={cn(DARK_BTN, "ml-auto bg-green-400 text-black hover:bg-green-300")}><Plus size={13} />Set Genius SIP</button>
              </>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 pt-4 text-[12px]">
            <span className="flex items-center gap-1.5 text-white/60"><ClockCounterClockwise size={14} />{g.lastRebalance ? <>Last move {shortDay(g.lastRebalance)} ({lastMove === 0 ? "today" : `${lastMove} day${lastMove === 1 ? "" : "s"} ago`})</> : "No moves recorded yet"}</span>
            {lastMove !== undefined && lastMove >= 28 && <span className="bg-amber-400/15 px-1.5 py-0.5 font-semibold text-amber-400">ET Money rebalances monthly. Check for changes.</span>}
            {g.moves.slice(0, 6).map((m) => (
              <span key={`${m.kind}${m.name}${m.date}`} className={cn("flex max-w-full items-center gap-1 px-1.5 py-0.5 font-medium", m.kind === "in" ? "bg-green-400/15 text-green-400" : "bg-red-400/15 text-red-400")}>
                {m.kind === "in" ? <SignIn size={12} weight="bold" /> : <SignOut size={12} weight="bold" />}<span className="truncate">{m.name}</span><span className="shrink-0 opacity-70">{shortDay(m.date)}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 mb-3 flex flex-wrap items-center gap-3">
        <Tabs<Filter> value={filter} items={FILTERS} onChange={setFilter} />
        <div className="relative ml-auto w-full sm:w-56">
          <MagnifyingGlass size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search funds" aria-label="Search funds" className="pl-8" />
        </div>
        <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort funds" className="w-full sm:w-40">
          <option value="value">Sort: Value</option><option value="returns">Sort: Returns</option><option value="invested">Sort: Invested</option><option value="name">Sort: Name</option>
        </Select>
      </div>

      {q.isLoading ? (
        <div className="space-y-3"><RowSkeleton /><RowSkeleton /></div>
      ) : items.length === 0 ? (
        <div className="border border-line py-10">
          <EmptyState icon={ChartPie}>Add a fund by its scheme code to track its value, returns and SIP.</EmptyState>
          <div className="mt-4 flex justify-center"><Button icon={Plus} onClick={() => setForm(null)}>Add your first fund</Button></div>
        </div>
      ) : shown.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-muted">No funds match.</p>
      ) : (
        <div className="space-y-4">
          {groups.map((grp) => (
            <section key={grp.key} className="overflow-hidden border border-line bg-surface">
              <GroupBar icon={grp.icon} title={grp.title} sub={grp.sub} funds={grp.funds} />
              <FundListHeader />
              <div className="divide-y divide-line-soft">
                {grp.funds.map((f) => <FundRow key={f.id} fund={f} share={s && s.value > 0 ? f.value / s.value : 0} onOpen={() => setOpen(f.id)} />)}
              </div>
            </section>
          ))}
          {gone.length > 0 && (
            <details className="group overflow-hidden border border-line bg-surface">
              <summary className="flex cursor-pointer list-none items-center gap-2 bg-tint px-4 py-2.5 text-[13px] font-semibold [&::-webkit-details-marker]:hidden">
                <SignOut size={16} weight="duotone" className="text-sub" />Moved out<span className="text-[12px] font-normal text-muted">{gone.length} fund{gone.length === 1 ? "" : "s"}</span>
                <CaretDown size={14} className="ml-auto text-muted transition-transform group-open:rotate-180" />
              </summary>
              <div className="divide-y divide-line-soft">{gone.map((f) => <ExitedRow key={f.id} fund={f} onOpen={() => setOpen(f.id)} />)}</div>
            </details>
          )}
        </div>
      )}

      {sel && (() => {
        const f = sel;
        return (
          <Modal title={f.name} subtitle={`${f.type} · ${f.platform} · ${f.membership}`} icon={ChartPie} wide onClose={() => setOpen(null)}>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <div className="num text-[28px] font-light leading-none">{rs(f.value)}</div>
                <div className="mt-1 text-[12px] text-muted">{f.active ? "Current value" : "Sold for"}</div>
              </div>
              <div className={cn("num inline-flex items-center gap-1 px-2 py-1 text-[13px] font-semibold", chip(f.pnl))}>{f.pnl > 0 ? <ArrowUpRight size={13} weight="bold" /> : f.pnl < 0 ? <ArrowDownRight size={13} weight="bold" /> : null}{f.pnl >= 0 ? "+" : ""}{rs(f.pnl)}{f.returnPct !== undefined && ` (${pct(f.returnPct)})`}{!f.active && " booked"}</div>
            </div>
            {!f.active && (
              <div className="mb-5 flex items-center gap-2 bg-tint p-3 text-[13px]"><SignOut size={16} className="shrink-0 text-muted" /><span>Moved out on <span className="font-semibold">{f.exitedAt ?? "an unknown date"}</span>. It no longer counts in your totals or SIPs.</span></div>
            )}
            <div className="grid gap-6 text-[13px] md:grid-cols-2">
              <div>
                <SectionTitle icon={Stack}>Holding</SectionTitle>
                <dl className="space-y-2">
                  {([["Scheme code", String(f.code)], ["Fund house", f.fundHouse ?? "–"], ["Units", f.units.toFixed(3)], ["Avg NAV", `₹${f.avgNav.toFixed(4)}`], ["Latest NAV", f.nav ? `₹${f.nav} (${f.navDate})` : "Not fetched"], ["Invested", rs(f.invested)], ["In portfolio since", f.joinedAt ?? "–"], ["Bank account", f.accountId ? bankOf.get(f.accountId) ?? "–" : "Not set"]] as const).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="num text-right font-medium">{v}</dd></div>
                  ))}
                </dl>
              </div>
              <div>
                {f.active ? <>
                  <SectionTitle icon={Repeat}>SIP</SectionTitle>
                  {f.membership === "Genius" ? (
                    <p className="text-muted">{g?.sip ? <>Bought through the Genius basket SIP of <span className="num font-semibold text-ink">{rs(g.sip.amount)}</span> a month, shared across every fund in the basket.</> : "Part of the Genius basket. Set one SIP for the whole basket on the Genius panel."}</p>
                  ) : f.sip ? (() => {
                    const st = sipStatus(f), sip = f.sip;
                    const setSip = (status: SipStatus, ok: string) => act(() => api(`/funds/${f.id}`, { method: "PUT", body: toInput(f, { ...sip, status }) }), { ok });
                    return (
                      <>
                        <p className="flex items-center gap-2 font-medium">{rs(sip.amount)} on the {sip.day}th{st === "active" && <span className="font-normal text-muted">· next in {f.sipInDays} day{f.sipInDays === 1 ? "" : "s"}</span>}<span className={cn("px-1.5 py-0.5 text-[11px] font-semibold capitalize", SIP_TONE[st])}>{st}</span></p>
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
                </> : <>
                  <SectionTitle icon={SignOut}>Exit</SectionTitle>
                  <dl className="space-y-2">
                    {([["Moved out on", f.exitedAt ?? "–"], ["Amount credited", rs(f.proceeds ?? 0)], ["Invested", rs(f.invested)], ["Gain booked", `${f.pnl >= 0 ? "+" : ""}${rs(f.pnl)}`]] as const).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="num text-right font-medium">{v}</dd></div>
                    ))}
                  </dl>
                </>}
                <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
                  {f.active && f.membership === "Genius" && <Button size="sm" variant="ghost" icon={SignOut} onClick={() => { setOpen(null); setRebalance([f.id]); }}>Moved out of Genius</Button>}
                  {!f.active && <Button size="sm" loading={busy} icon={SignIn} onClick={() => act(() => api(`/funds/${f.id}/reenter`, { method: "POST" }), { ok: "Fund is back in your portfolio" })}>Move back in</Button>}
                  <Button size="sm" variant="ghost" onClick={() => { setOpen(null); setForm(f); }}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => window.confirm(`Remove ${f.name} and its history?`) && act(() => api(`/funds/${f.id}`, { method: "DELETE" }), { ok: "Fund removed", onDone: () => setOpen(null) })}>Remove</Button>
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}

      {sipDialog && <GeniusSipDialog initial={g?.sip} pending={acting} onSave={saveGeniusSip} onClose={() => setSipDialog(false)} />}
      {rebalance && <RebalanceDialog key={rebalance.join()} funds={geniusLive} preselect={rebalance} pending={acting} onExit={moveOut} onClose={() => setRebalance(null)} onAddIncoming={() => { setRebalance(null); setIncoming(true); setForm(null); }} />}
      {form !== undefined && <FundForm key={form?.id ?? (incoming ? "incoming" : "new")} initial={form ?? undefined} preset={incoming ? { membership: "Genius", platform: "ET Money" } : undefined} onSave={save} onClose={() => { setForm(undefined); setIncoming(false); }} />}
    </PageLayout>
  );
}
