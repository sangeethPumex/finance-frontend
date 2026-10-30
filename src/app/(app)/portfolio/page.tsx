"use client";

import { useState } from "react";
import { BellRinging, ChartDonut, Trash } from "@phosphor-icons/react";
import { Button, Input, Select } from "@/components/atoms";
import { BarRow, Card, EmptyState, FormField, StatCard, Tabs } from "@/components/molecules";
import { PageLayout } from "@/components/templates";
import { api, type AllocSlice, type Return, type SipCheck, type Target, useAct, useAlerts, useIncome, usePortfolio } from "@/lib/api";
import { cn } from "@/lib/cn";
import { inr } from "@/lib/money";

const rs = (n: number) => inr(Math.round(n * 100));
const pct = (r?: number) => (r == null ? "—" : `${r >= 0 ? "+" : ""}${(r * 100).toFixed(1)}%`);
const tone = (r?: number) => (r == null ? "neutral" : r >= 0 ? "good" : "bad");
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const CLASSES = ["equity", "debt", "gold", "cash"] as const;
const TABS = [{ value: "mix", label: "Mix & returns" }, { value: "sips", label: "SIP health" }, { value: "income", label: "Income" }, { value: "alerts", label: "Alerts" }] as const;
type Tab = (typeof TABS)[number]["value"];

export default function Portfolio() {
  const q = usePortfolio();
  const [tab, setTab] = useState<Tab>("mix");
  return (
    <PageLayout title="Portfolio" icon={ChartDonut} error={q.error}>
      <div className="mb-4"><Tabs value={tab} onChange={setTab} items={[...TABS]} /></div>
      {tab === "mix" && q.data && <Mix {...q.data} />}
      {tab === "sips" && q.data && <Sips sips={q.data.sips} />}
      {tab === "income" && <IncomeTab />}
      {tab === "alerts" && <AlertsTab />}
    </PageLayout>
  );
}

function Mix({ allocation, target, returns }: { allocation: { total: number; slices: AllocSlice[] }; target?: Target; returns: { portfolio?: number; funds: Return[]; stocks: Return[] } }) {
  const act = useAct();
  const [edit, setEdit] = useState<Record<string, string> | null>(null);
  const sum = edit ? CLASSES.reduce((s, c) => s + (Number(edit[c]) || 0), 0) : 0;
  const save = () => act(() => api("/portfolio/target", { method: "PUT", body: Object.fromEntries(CLASSES.map((c) => [c, Number(edit![c]) || 0])) }), { ok: "Target saved", onDone: () => setEdit(null) });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Portfolio XIRR" value={pct(returns.portfolio)} tone={tone(returns.portfolio)} sub={returns.portfolio == null ? "Needs 30+ days of history" : "Funds and stocks, annualised"} />
        <StatCard label="Total (with cash)" value={rs(allocation.total)} />
      </div>
      <Card title="Allocation" action={edit ? null : <Button variant="ghost" size="sm" onClick={() => setEdit(Object.fromEntries(CLASSES.map((c) => [c, String(target?.[c] ?? 0)])))}>{target ? "Edit target" : "Set target"}</Button>}>
        <div className="space-y-4">
          {allocation.slices.map((s) => (
            <div key={s.class}>
              <BarRow label={s.class[0].toUpperCase() + s.class.slice(1)} value={`${rs(s.value)} · ${s.pct.toFixed(1)}%`} ratio={s.pct / 100} />
              {s.target != null && s.drift != null && s.shift != null && (
                <div className="mt-1 text-[12px] text-muted">
                  Target {s.target}% · <span className={cn(Math.abs(s.drift) >= 5 ? "text-loss" : "text-gain")}>{s.drift >= 0 ? "+" : ""}{s.drift.toFixed(1)} pts</span>
                  {Math.abs(s.shift) >= 1 && ` · ${s.shift > 0 ? "add" : "trim"} ${rs(Math.abs(s.shift))}`}
                </div>
              )}
            </div>
          ))}
        </div>
        {edit && (
          <form className="mt-5 border-t border-line pt-4" onSubmit={(e) => { e.preventDefault(); if (Math.abs(sum - 100) < 0.01) save(); }}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {CLASSES.map((c) => <FormField key={c} label={`${c} %`}><Input type="number" min={0} max={100} step="any" value={edit[c]} onChange={(e) => setEdit({ ...edit, [c]: e.target.value })} /></FormField>)}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button type="submit" disabled={Math.abs(sum - 100) >= 0.01}>Save</Button>
              <Button type="button" variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
              {target && <Button type="button" variant="ghost" onClick={() => act(() => api("/portfolio/target", { method: "DELETE" }), { ok: "Target removed", onDone: () => setEdit(null) })}>Remove</Button>}
              <span className={cn("text-[12px]", Math.abs(sum - 100) < 0.01 ? "text-muted" : "text-loss")}>Adds to {sum}%</span>
            </div>
          </form>
        )}
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Rates title="Funds" rows={returns.funds} note="Dated from the join date unless SIP instalments were logged" />
        <Rates title="Stocks" rows={returns.stocks} />
      </div>
    </div>
  );
}

function Rates({ title, rows, note }: { title: string; rows: Return[]; note?: string }) {
  return (
    <Card title={`${title} XIRR`}>
      {rows.length === 0 ? <EmptyState>Nothing held yet</EmptyState> : (
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center justify-between gap-3 py-2 text-[13px]">
              <span className="truncate">{r.name || r.key}{!r.exact && <span title={note} className="ml-1 text-muted">≈</span>}</span>
              <span className={cn("num shrink-0", r.rate == null ? "text-muted" : r.rate >= 0 ? "text-gain" : "text-loss")}>{pct(r.rate)}</span>
            </li>
          ))}
        </ul>
      )}
      {note && rows.some((r) => !r.exact) && <p className="mt-3 text-[12px] text-muted">≈ {note}</p>}
    </Card>
  );
}

const SIP_STATE = { ok: "On track", due: "Due now", missed: "Missed", paused: "Paused" } as const;
function Sips({ sips }: { sips: SipCheck[] }) {
  if (sips.length === 0) return <EmptyState>No SIPs set up</EmptyState>;
  return (
    <Card title="SIP health">
      <ul className="divide-y divide-line">
        {sips.map((s) => (
          <li key={s.name} className="py-3 text-[13px]">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate font-medium">{s.name}</span>
              <span className={cn("shrink-0", s.state === "missed" ? "text-loss" : s.state === "ok" ? "text-gain" : "text-muted")}>{SIP_STATE[s.state]}</span>
            </div>
            <div className="mt-1 text-muted">
              {rs(s.amount)} on the {s.day}th · {s.lastLogged ? `last logged ${day(s.lastLogged)}` : "no instalment logged"}
            </div>
            {s.stepUp === "up" && <div className="mt-1 text-gain">Stepped up {pct(s.stepUpPct)} over the last year</div>}
            {s.stepUp === "none" && <div className="mt-1 text-warn">Not raised in over a year. Time to step it up?</div>}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] text-muted">Missed means no instalment was recorded in the app within 3 days of the SIP date.</p>
    </Card>
  );
}

function IncomeTab() {
  const q = useIncome();
  const act = useAct();
  const [f, setF] = useState({ date: new Date().toISOString().slice(0, 10), kind: "dividend", source: "", amount: "" });
  const d = q.data;
  const max = Math.max(1, ...(d?.months.map((m) => m.dividend + m.interest) ?? []));
  return (
    <div className="space-y-4">
      {d && (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard label={`Dividends FY ${d.fy}`} value={rs(d.dividend)} />
          <StatCard label={`Interest FY ${d.fy}`} value={rs(d.interest)} />
          <StatCard label="Last FY total" value={rs(d.lastFy)} />
        </div>
      )}
      {d && (
        <Card title="Last 12 months">
          <div className="flex h-28 items-end gap-1.5">
            {d.months.map((m) => (
              <div key={m.ym} className="flex flex-1 flex-col justify-end" title={`${m.ym}: ${rs(m.dividend + m.interest)}`}>
                <div className="bg-gain" style={{ height: `${(m.dividend / max) * 100}%` }} />
                <div className="bg-ink" style={{ height: `${(m.interest / max) * 100}%` }} />
              </div>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-muted">Green dividends, dark interest. Bank SMS credits mentioning dividend or interest are counted automatically; add only what no SMS reports.</p>
        </Card>
      )}
      <Card title="Add income">
        <form className="grid gap-4 sm:grid-cols-5" onSubmit={(e) => { e.preventDefault(); act(() => api("/portfolio/income", { method: "POST", body: { ...f, amount: Number(f.amount) } }), { ok: "Income added", onDone: () => setF({ ...f, source: "", amount: "" }) }); }}>
          <FormField label="Date"><Input type="date" max={new Date().toISOString().slice(0, 10)} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></FormField>
          <FormField label="Kind"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="dividend">Dividend</option><option value="interest">Interest</option></Select></FormField>
          <FormField label="Source"><Input maxLength={60} value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} placeholder="TCS, SBI FD…" /></FormField>
          <FormField label="Amount (₹)"><Input type="number" min={0} step="any" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></FormField>
          <div className="flex items-end"><Button type="submit" disabled={!f.source.trim() || !(Number(f.amount) > 0)}>Add</Button></div>
        </form>
      </Card>
      {d && d.entries.length > 0 && (
        <Card title="Entries">
          <ul className="divide-y divide-line">
            {d.entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                <span className="truncate">{e.source} <span className="text-muted">· {e.kind} · {day(e.date)}</span></span>
                <span className="flex shrink-0 items-center gap-3"><span className="num">{rs(e.amount)}</span>
                  <button aria-label="Delete" className="text-muted hover:text-loss" onClick={() => act(() => api(`/portfolio/income/${e.id}`, { method: "DELETE" }), { ok: "Deleted" })}><Trash size={15} /></button></span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function AlertsTab() {
  const q = useAlerts();
  const act = useAct();
  const [f, setF] = useState({ kind: "stock", ref: "", op: "above", price: "" });
  const list = q.data ?? [];
  return (
    <div className="space-y-4">
      <Card title="New alert">
        <form className="grid gap-4 sm:grid-cols-5" onSubmit={(e) => { e.preventDefault(); act(() => api("/alerts", { method: "POST", body: { ...f, price: Number(f.price) } }), { ok: "Alert set", onDone: () => setF({ ...f, ref: "", price: "" }) }); }}>
          <FormField label="Type"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="stock">Stock</option><option value="fund">Fund</option></Select></FormField>
          <FormField label={f.kind === "stock" ? "Symbol" : "Scheme code"}><Input value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} placeholder={f.kind === "stock" ? "RELIANCE.NS" : "119551"} /></FormField>
          <FormField label="When price is"><Select value={f.op} onChange={(e) => setF({ ...f, op: e.target.value })}><option value="above">At or above</option><option value="below">At or below</option></Select></FormField>
          <FormField label={f.kind === "stock" ? "Price (₹)" : "NAV (₹)"}><Input type="number" min={0} step="any" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></FormField>
          <div className="flex items-end"><Button type="submit" icon={BellRinging} disabled={!f.ref.trim() || !(Number(f.price) > 0)}>Set</Button></div>
        </form>
      </Card>
      {list.length === 0 ? <EmptyState icon={BellRinging}>No alerts yet</EmptyState> : (
        <Card title="Alerts">
          <ul className="divide-y divide-line">
            {list.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3 text-[13px]">
                <div className="min-w-0">
                  <div className="truncate font-medium">{a.name || a.ref}</div>
                  <div className="text-muted">
                    {a.op === "above" ? "At or above" : "At or below"} {rs(a.price)}
                    {a.triggeredAt ? <> · <span className="text-warn">fired {day(a.triggeredAt)} at {rs(a.triggeredPrice ?? 0)}</span></> : a.current != null ? ` · now ${rs(a.current)}` : ""}
                  </div>
                </div>
                <button aria-label="Delete" className="shrink-0 text-muted hover:text-loss" onClick={() => act(() => api(`/alerts/${a.id}`, { method: "DELETE" }), { ok: "Alert removed" })}><Trash size={15} /></button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-muted">Checked every 5 minutes on the server; a fired alert stays here until you delete it.</p>
        </Card>
      )}
    </div>
  );
}
