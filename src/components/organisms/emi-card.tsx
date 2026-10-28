"use client";

import { useState } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { CaretRight, CreditCard, CurrencyInr, DotsThreeVertical, HandCoins, Percent, Receipt } from "@phosphor-icons/react";
import { api, type EmiView, useAct, useEmiImpact } from "@/lib/api";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/dates";
import { inr } from "@/lib/money";
import { Button, Input } from "../atoms";
import { FormField, Meter, Modal, Tabs } from "../molecules";
import { KIND_ICON, KIND_LABEL } from "./emi-form";
import { LoanSchedule } from "./loan-schedule";
import { RateHistory } from "./rate-history";

const rs = (n: number) => inr(Math.round(n * 100));

function ExtraPayment({ emi, onClose }: { emi: EmiView; onClose: () => void }) {
  const act = useAct();
  const [v, setV] = useState({ amount: "", interest: "", fees: "" });
  const amount = Number(v.amount), interest = Number(v.interest) || 0, fees = Number(v.fees) || 0, principal = amount - interest - fees;
  const ok = amount > 0 && interest >= 0 && fees >= 0 && principal >= 0;
  const impact = useEmiImpact(emi.id, ok ? principal : 0).data;
  const field = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <Modal title="Extra payment" subtitle={emi.name} icon={HandCoins} onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (ok) act(() => api(`/emis/${emi.id}/payments`, { method: "POST", body: { kind: "extra", amount, interest, fees } }), { ok: "Extra payment recorded", onDone: onClose }); }}>
        <FormField label="Amount paid (₹)" icon={CurrencyInr}><Input type="number" min={0} step="any" value={v.amount} onChange={field("amount")} autoFocus /></FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Of which interest (₹)" icon={Percent}><Input type="number" min={0} step="any" value={v.interest} onChange={field("interest")} placeholder="0" /></FormField>
          <FormField label="Of which fees (₹)" icon={Receipt}><Input type="number" min={0} step="any" value={v.fees} onChange={field("fees")} placeholder="0" /></FormField>
        </div>
        <p className="text-[13px] text-muted">Reduces principal by <span className="num font-semibold text-ink">{ok ? rs(principal) : "–"}</span>. Check your lender&apos;s receipt for the real split.</p>
        {ok && impact?.available && (
          <p className="border border-line bg-tint p-3 text-[12px] text-sub">
            Estimate: saves about <span className="num text-gain">{rs(impact.interestSaved ?? 0)}</span> interest and finishes {impact.monthsSaved} month{impact.monthsSaved === 1 ? "" : "s"} sooner ({impact.monthsLeft} left). Not lender-confirmed.
          </p>
        )}
        <div className="border-t border-line pt-4"><Button type="submit" disabled={!ok}>Record extra payment</Button></div>
      </form>
    </Modal>
  );
}

const Tile = ({ label, value, red }: { label: string; value: string; red?: boolean }) => (
  <div className="rounded-md bg-tint px-3.5 py-3"><div className="text-[11px] text-muted">{label}</div><div className={cn("num mt-0.5 text-[16px] font-medium", red && "text-loss")}>{value}</div></div>
);

/** Circular progress; children sit in the middle. */
function Ring({ ratio, children }: { ratio: number; children: React.ReactNode }) {
  const R = 20, C = 2 * Math.PI * R;
  return (
    <span className="relative grid size-12 shrink-0 place-items-center" role="progressbar" aria-valuenow={Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100}>
      <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90">
        <circle cx="24" cy="24" r={R} fill="none" strokeWidth="4" className="stroke-tint" />
        <circle cx="24" cy="24" r={R} fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-gain transition-[stroke-dashoffset] duration-500" strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(Math.max(ratio, 0), 1))} />
      </svg>
      {children}
    </span>
  );
}

/** One dot per instalment: green paid, outlined next due, grey to come. */
function Instalments({ paid, total, active }: { paid: number; total: number; active: boolean }) {
  if (total > 60) return <Meter ratio={paid / total} tone="good" />;
  return (
    <div className="flex flex-wrap gap-1" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cn("size-2.5 rounded-full", i < paid ? "bg-gain" : i === paid && active ? "bg-white ring-2 ring-warn" : "bg-line")} />
      ))}
    </div>
  );
}

/** One loan as an expandable summary: balance first, one primary action, the rest in a menu. All figures come from the backend. */
export function EmiCard({ emi, onEdit }: { emi: EmiView; onEdit: () => void }) {
  const act = useAct();
  const busy = useIsMutating() > 0;
  const [open, setOpen] = useState(false);
  const [extra, setExtra] = useState(false);
  const [tab, setTab] = useState<"overview" | "breakdown">("overview");
  const Icon = KIND_ICON[emi.kind], isCard = emi.kind === "card", history = emi.payments ?? [];
  const post = (body: unknown) => act(() => api(`/emis/${emi.id}/payments`, { method: "POST", body }), { ok: "Payment recorded" });
  const reconcile = () => {
    const v = window.prompt("Outstanding balance from your lender statement (₹)", String(emi.balance ?? emi.left));
    const n = v === null || v.trim() === "" ? NaN : Number(v);
    if (Number.isFinite(n) && n >= 0) act(() => api(`/emis/${emi.id}/balance`, { method: "PUT", body: { balance: n } }), { ok: "Balance updated" });
  };
  const menu = (label: string, fn: () => void, disabled = false) => (
    <button type="button" disabled={disabled} className="block w-full px-3 py-2 text-left text-[13px] hover:bg-tint disabled:opacity-40" onClick={(e) => { e.currentTarget.closest("details")?.removeAttribute("open"); fn(); }}>{label}</button>
  );

  return (
    <div className="border border-line bg-white">
      <div className="flex flex-wrap items-start gap-4 p-4 md:p-5">
        {isCard ? <span className="grid size-12 shrink-0 place-items-center rounded-full bg-tint text-ink"><Icon size={20} weight="duotone" /></span> : (
          <Ring ratio={emi.repaid ?? (emi.total ? emi.paid / emi.total : 0)}>
            <span className="num text-[11px] font-medium">{Math.round((emi.repaid ?? (emi.total ? emi.paid / emi.total : 0)) * 100)}%</span>
          </Ring>
        )}
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2"><span className="truncate font-semibold">{emi.name}</span><CaretRight size={14} className="text-muted" />{emi.cardName && <span className="flex items-center gap-1 bg-tint px-1.5 py-0.5 text-[11px] font-medium text-sub"><CreditCard size={12} />{emi.cardName}</span>}</div>
          <div className="num mt-1 text-[24px] font-light leading-none tracking-tight">{emi.active ? rs(emi.left) : "Closed"}</div>
          <div className="mt-2 text-[12px] text-muted">
            {rs(emi.amount)} {isCard ? "minimum" : "a month"} · due the {emi.dueDay}th{emi.active && emi.daysToDue <= 7 && <span className={cn("ml-2 px-1.5 py-0.5 font-medium", emi.daysToDue <= 3 ? "bg-loss-bg text-loss" : "bg-warn/10 text-warn")}>due in {emi.daysToDue} day{emi.daysToDue === 1 ? "" : "s"}</span>}
          </div>
        </button>
        <div className="flex w-full items-center justify-end gap-2 md:w-auto">
          {emi.kind === "loan" && <Button variant="ghost" size="sm" disabled={!emi.active} onClick={() => setExtra(true)}>Extra payment</Button>}
          <Button size="sm" loading={busy} disabled={!emi.active} onClick={() => post({ kind: "emi" })}>Record payment</Button>
          <details className="relative">
            <summary className="grid size-8 cursor-pointer list-none place-items-center text-muted hover:bg-tint hover:text-ink [&::-webkit-details-marker]:hidden" aria-label="More actions"><DotsThreeVertical size={18} /></summary>
            <div className="absolute right-0 z-10 mt-1 w-44 border border-line bg-white shadow-sm">
              {menu("Edit", onEdit)}
              {emi.balance !== undefined && menu("Update balance", reconcile)}
              {menu("Undo last payment", () => act(() => api(`/emis/${emi.id}/payments/last`, { method: "DELETE" }), { ok: "Last payment undone" }), history.length === 0)}
              {menu("Delete", () => window.confirm(`Delete ${emi.name}?`) && act(() => api(`/emis/${emi.id}`, { method: "DELETE" }), { ok: "Loan deleted" }))}
            </div>
          </details>
        </div>
      </div>

      <div className="space-y-3 px-4 pb-4 md:px-5 md:pb-5 md:pl-[84px]">
        {!isCard && <div><div className="mb-1.5 text-[12px] text-muted"><span className="font-medium text-gain">{emi.paid} paid</span> · {emi.instalmentsLeft} to go of {emi.total}</div><Instalments paid={emi.paid} total={emi.total} active={emi.active} /></div>}
        {emi.repaid !== undefined && emi.original !== undefined && <div><div className="mb-1 text-[12px] text-muted">{Math.round(emi.repaid * 100)}% of {rs(emi.original)} repaid</div><Meter ratio={emi.repaid} tone="good" /></div>}
        {emi.paidPrincipal + emi.paidInterest > 0 && (
          <div>
            <div className="mb-1 flex justify-between text-[12px] text-muted">
              <span><span className="font-medium text-gain">{rs(emi.paidPrincipal)}</span> principal</span>
              <span><span className="font-medium text-loss">{rs(emi.paidInterest)}</span> interest &amp; fees</span>
            </div>
            <div className="flex h-1.5 w-full overflow-hidden bg-tint"><div className="bg-gain" style={{ width: `${(emi.paidPrincipal / (emi.paidPrincipal + emi.paidInterest)) * 100}%` }} /><div className="flex-1 bg-loss" /></div>
          </div>
        )}
      </div>

      {open && (
        <Modal title={emi.name} subtitle={`${KIND_LABEL[emi.kind]}${emi.cardName ? ` · on ${emi.cardName}` : ""}`} icon={Icon} wide onClose={() => setOpen(false)}>
          {emi.kind === "loan" && <div className="mb-5"><Tabs<"overview" | "breakdown"> value={tab} onChange={setTab} items={[{ value: "overview", label: "Overview" }, { value: "breakdown", label: "Breakdown" }]} /></div>}
          {tab === "breakdown" && emi.kind === "loan" ? <LoanSchedule id={emi.id} /> : (
            <div className="space-y-7 text-[13px]">
              <div>
                <div className="num text-[30px] font-light leading-none">{emi.active ? rs(emi.left) : "Closed"}</div>
                <div className="mt-1.5 text-[12px] text-muted">{rs(emi.amount)} {isCard ? "minimum" : "a month"} · due the {emi.dueDay}th</div>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Tile label="Principal paid" value={rs(emi.paidPrincipal)} />
                <Tile label="Interest paid" value={rs(emi.paidInterest)} red />
                {emi.rate !== undefined && <Tile label="Rate" value={`${emi.rate}%`} />}
                {!isCard && <Tile label="Payments left" value={String(emi.instalmentsLeft)} />}
              </div>
              {emi.kind === "loan" && emi.rate !== undefined && <RateHistory emi={emi} />}
              {history.length > 0 && (
                <div>
                  <h4 className="mb-1 text-[12px] font-medium text-muted">Recent payments</h4>
                  <ul className="divide-y divide-line-soft">
                    {history.slice(0, 4).map((p) => (
                      <li key={p.id} className="flex justify-between py-1.5"><span>{shortDate(p.date)} · {p.kind === "extra" ? "Extra" : "EMI"}</span><span className="num">{rs(p.amount)}</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
      {extra && <ExtraPayment emi={emi} onClose={() => setExtra(false)} />}
    </div>
  );
}
