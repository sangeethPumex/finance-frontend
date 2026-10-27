"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChartLineUp, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/atoms";
import { Card, Donut, EmptyState, Modal, RowSkeleton, StatCard, StatSkeleton } from "@/components/molecules";
import { StockForm } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { api, type StockInput, type StockLot, type StockPosition, useAct, useStocks } from "@/lib/api";
import { cn } from "@/lib/cn";
import { inr } from "@/lib/money";

const rs = (n: number) => inr(Math.round(n * 100));
const sign = (n: number) => (n >= 0 ? "+" : "");
const pct = (r: number) => `${sign(r)}${(r * 100).toFixed(2)}%`;
const chip = (n: number) => (n > 0 ? "bg-gain-bg text-gain" : n < 0 ? "bg-loss-bg text-loss" : "bg-tint text-muted");
const edge = (n: number) => (n > 0 ? "border-t-gain" : n < 0 ? "border-t-loss" : "border-t-line");
const text = (n: number) => (n > 0 ? "text-gain" : n < 0 ? "text-loss" : "text-muted");
const tone = (n: number) => (n > 0 ? "good" : n < 0 ? "bad" : "neutral");
const asOf = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
/** "1y 3m", "5m", "12d": how long ago a purchase was made. */
const held = (iso: string) => {
  const d = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 864e5)), m = Math.floor(d / 30.44);
  return m >= 12 ? `${Math.floor(m / 12)}y${m % 12 ? ` ${m % 12}m` : ""}` : m >= 1 ? `${m}m` : `${d}d`;
};
const toInput = (l: StockLot): StockInput => ({ symbol: l.symbol, quantity: l.quantity, buyPrice: l.buyPrice, buyDate: l.buyDate });

/** form: undefined closed; { symbol } adding (symbol prefilled when adding to a holding); { lot } editing. */
type FormState = undefined | { lot?: StockLot; symbol?: string };

export default function Stocks() {
  const q = useStocks();
  const act = useAct();
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(undefined);

  const s = q.data?.summary, positions = q.data?.positions ?? [];
  const sel: StockPosition | undefined = positions.find((p) => p.symbol === open);

  const save = (input: StockInput) =>
    act(() => (form?.lot ? api(`/stocks/${form.lot.id}`, { method: "PUT", body: input }) : api("/stocks", { method: "POST", body: input })), { ok: form?.lot ? "Purchase updated" : "Purchase added", onDone: () => setForm(undefined) });

  return (
    <PageLayout title="Stocks" icon={ChartLineUp} error={q.error} action={<Button icon={Plus} disabled={!q.isSuccess} onClick={() => setForm({})}>Add purchase</Button>}>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {q.isLoading ? [0, 1, 2, 3].map((i) => <StatSkeleton key={i} />) : <>
        <StatCard label="Current Value" value={rs(s?.value ?? 0)} sub={s?.asOf ? `${s.stale ? "Last known prices, " : ""}as of ${asOf(s.asOf)}` : "Add a purchase to start"} tone={s?.stale ? "warn" : "neutral"} />
        <StatCard label="Invested" value={rs(s?.invested ?? 0)} sub={`${positions.length} holding${positions.length === 1 ? "" : "s"}${s?.unpriced ? ` · ${s.unpriced} unpriced` : ""}`} />
        <StatCard label="Unrealized P&L" value={`${sign(s?.pnl ?? 0)}${rs(s?.pnl ?? 0)}`} tone={tone(s?.pnl ?? 0)} sub={s && s.invested > 0 ? pct(s.pnlPct) : undefined} />
        <StatCard label="Day Change" value={`${sign(s?.dayChange ?? 0)}${rs(s?.dayChange ?? 0)}`} tone={tone(s?.dayChange ?? 0)} sub={s && s.value > 0 ? pct(s.dayPct) : undefined} />
        </>}
      </div>

      {positions.length > 1 && (
        <div className="mt-4"><Card title="Allocation"><Donut label="Allocation by holding" slices={positions.map((p) => ({ name: p.name ?? p.symbol, value: p.value }))} /></Card></div>
      )}

      <div className="mt-6">
        {q.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><RowSkeleton /><RowSkeleton /><RowSkeleton /></div>
        ) : positions.length === 0 ? (
          <div className="border border-line py-10">
            <EmptyState icon={ChartLineUp}>Add what you own: symbol, quantity, buy price and date. Prices are fetched live and never stored with your holdings.</EmptyState>
            <div className="mt-4 flex justify-center"><Button icon={Plus} onClick={() => setForm({})}>Add your first purchase</Button></div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {positions.map((p) => (
              <button key={p.symbol} type="button" aria-haspopup="dialog" onClick={() => setOpen(p.symbol)} className={cn("flex flex-col border border-t-4 border-line bg-white p-5 text-left transition-shadow hover:shadow-md", edge(p.pnl))}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.name ?? p.symbol}</div>
                    <div className="num mt-0.5 text-[12px] text-muted">{p.symbol} · {p.lots.length} purchase{p.lots.length === 1 ? "" : "s"}</div>
                  </div>
                  {p.price !== undefined && (
                    <div className="num shrink-0 text-right">
                      <div className="text-[14px]">₹{p.price.toFixed(2)}</div>
                      <div className={cn("text-[12px]", text(p.dayChange))}>{pct(p.dayPct)}</div>
                    </div>
                  )}
                </div>
                <div className="num mt-4 text-[26px] font-light leading-none">{rs(p.value)}</div>
                <div className={cn("num mt-2 inline-flex w-fit items-center gap-1 px-1.5 py-0.5 text-[12px] font-medium", chip(p.pnl))}>
                  {p.pnl > 0 ? <ArrowUpRight size={12} weight="bold" /> : p.pnl < 0 ? <ArrowDownRight size={12} weight="bold" /> : null}
                  {sign(p.pnl)}{rs(p.pnl)} ({pct(p.pnlPct)})
                </div>
                <div className="num mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-[12px]">
                  <div><div className="text-muted">Qty</div>{p.quantity}</div>
                  <div><div className="text-muted">Avg buy</div>₹{p.avgPrice.toFixed(2)}</div>
                  <div><div className="text-muted">Weight</div>{(p.allocation * 100).toFixed(1)}%</div>
                </div>
                <div className="mt-3 h-1 bg-tint"><div className="h-full bg-ink" style={{ width: `${Math.min(100, p.allocation * 100)}%` }} /></div>
                {p.price === undefined ? <div className="mt-2 text-[12px] text-warn">No price yet, shown at cost</div> : p.stale && <div className="mt-2 text-[12px] text-warn">Last known price</div>}
              </button>
            ))}
          </div>
        )}
      </div>

      {sel && (
        <Modal title={sel.name ?? sel.symbol} wide onClose={() => setOpen(null)}>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <div className="num text-[28px] font-light leading-none">{rs(sel.value)}</div>
              <div className="num mt-1 text-[12px] text-muted">{sel.symbol} · {sel.price !== undefined ? `₹${sel.price.toFixed(2)}${sel.prevClose ? ` · prev close ₹${sel.prevClose.toFixed(2)}` : ""} · as of ${asOf(sel.asOf)}` : "No price available"}</div>
            </div>
            <div className={cn("num px-2 py-1 text-[13px] font-medium", chip(sel.pnl))}>{sign(sel.pnl)}{rs(sel.pnl)} ({pct(sel.pnlPct)})</div>
          </div>
          <div className="mb-2 flex items-center justify-between">
            <div className="eyebrow">Purchase history</div>
            <Button size="sm" icon={Plus} onClick={() => { setOpen(null); setForm({ symbol: sel.symbol }); }}>Add purchase</Button>
          </div>
          <div className="overflow-x-auto border border-line">
            <table className="num w-full min-w-[640px] text-[13px]">
              <thead className="bg-tint text-left text-[11px] uppercase tracking-wide text-muted">
                <tr><th className="p-3 font-medium">Date</th><th className="p-3 text-right font-medium">Qty</th><th className="p-3 text-right font-medium">Buy price</th><th className="p-3 text-right font-medium">Cost</th><th className="p-3 text-right font-medium">Value now</th><th className="p-3 text-right font-medium">P&amp;L</th><th className="p-3" /></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sel.lots.map((l) => (
                  <tr key={l.id}>
                    <td className="p-3">{day(l.buyDate)}<div className="text-[11px] text-muted">{held(l.buyDate)} ago</div></td>
                    <td className="p-3 text-right">{l.quantity}</td>
                    <td className="p-3 text-right">₹{l.buyPrice.toFixed(2)}</td>
                    <td className="p-3 text-right">{rs(l.quantity * l.buyPrice)}</td>
                    <td className="p-3 text-right">{rs(l.value)}</td>
                    <td className={cn("p-3 text-right", text(l.pnl))}>{sign(l.pnl)}{rs(l.pnl)}<div className="text-[11px]">{pct(l.returnPct)}</div></td>
                    <td className="whitespace-nowrap p-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => { setOpen(null); setForm({ lot: l }); }}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => window.confirm("Remove this purchase?") && act(() => api(`/stocks/${l.id}`, { method: "DELETE" }), { ok: "Purchase removed", onDone: () => sel.lots.length === 1 && setOpen(null) })}>Remove</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-line bg-tint font-medium">
                <tr>
                  <td className="p-3">Total</td><td className="p-3 text-right">{sel.quantity}</td><td className="p-3 text-right">₹{sel.avgPrice.toFixed(2)} avg</td>
                  <td className="p-3 text-right">{rs(sel.invested)}</td><td className="p-3 text-right">{rs(sel.value)}</td>
                  <td className={cn("p-3 text-right", text(sel.pnl))}>{sign(sel.pnl)}{rs(sel.pnl)}<div className="text-[11px]">{pct(sel.pnlPct)}</div></td><td />
                </tr>
              </tfoot>
            </table>
          </div>
        </Modal>
      )}

      {form && <StockForm key={form.lot?.id ?? "new"} initial={form.lot && toInput(form.lot)} symbol={form.symbol} onSave={save} onClose={() => setForm(undefined)} />}
    </PageLayout>
  );
}
