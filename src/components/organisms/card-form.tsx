"use client";

import { useState } from "react";
import { Bank, CalendarCheck, CreditCard, Gauge, HandCoins, Hash, Receipt, ShareNetwork, Tag, Wallet } from "@phosphor-icons/react";
import { useCards, type Card, type CardInput, type CardKind } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Button, Input, Select } from "../atoms";
import { FormField, Modal } from "../molecules";

const KINDS: { kind: CardKind; label: string; hint: string; icon: typeof CreditCard; placeholder: string }[] = [
  { kind: "credit", label: "Credit card", hint: "Bank-issued card with a statement", icon: CreditCard, placeholder: "HDFC Regalia" },
  { kind: "paylater", label: "Pay later", hint: "Amazon Pay Later, Simpl and similar", icon: HandCoins, placeholder: "Amazon Pay Later" },
];

type Draft = { name: string; bank: string; last4: string; network: string; limit: string; billingDay: string; dueDay: string; apr: string; outstanding: string; sharedWith: string };
const rupees = (paise?: number) => (paise ? String(paise / 100) : "");
const toDraft = (c?: Card): Draft => ({
  name: c?.name ?? "", bank: c?.bank ?? "", last4: c?.last4 ?? "", network: c?.network ?? "", limit: rupees(c?.limit_paise),
  billingDay: c?.billing_day ? String(c.billing_day) : "", dueDay: c?.due_day ? String(c.due_day) : "",
  apr: c?.apr ? String(c.apr) : "",
  outstanding: c?.outstanding_paise !== undefined ? String(c.outstanding_paise / 100) : "", sharedWith: c?.shared_with ?? "",
});
const day = (v: string) => (v.trim() === "" ? 0 : Math.round(Number(v)));
const validDay = (n: number) => Number.isInteger(n) && n >= 0 && n <= 31;

/** Add or edit a credit card or pay-later line. Everything but the name is optional; blanks clear the field when editing. */
export function CardForm({ initial, onSave, onClose, pending }: { initial?: Card; onSave: (c: CardInput) => void; onClose: () => void; pending?: boolean }) {
  const [kind, setKind] = useState<CardKind>(initial?.kind ?? "credit");
  const [d, setD] = useState<Draft>(toDraft(initial));
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });
  // Only a card that owns its limit can be shared from, and a card others share from cannot itself share.
  const cards = useCards().data ?? [];
  const owners = cards.filter((c) => c.id !== initial?.id && !c.shared_with);
  const hasSharers = (initial?.shared_cards.length ?? 0) > 0 && !initial?.shared_with;
  const sharing = d.sharedWith !== "";
  const limit = d.limit.trim() === "" ? 0 : Number(d.limit), outstanding = d.outstanding.trim() === "" ? undefined : Number(d.outstanding);
  const apr = d.apr.trim() === "" ? 0 : Number(d.apr);
  const ok = d.name.trim() !== "" && Number.isFinite(apr) && apr >= 0 && apr <= 100 && /^(\d{4})?$/.test(d.last4) && Number.isFinite(limit) && limit >= 0 && validDay(day(d.billingDay)) && validDay(day(d.dueDay)) &&
    (outstanding === undefined || (Number.isFinite(outstanding) && outstanding >= 0));
  const spec = KINDS.find((k) => k.kind === kind)!;

  const build = (): CardInput => ({
    name: d.name.trim(), kind, bank: d.bank.trim(), last4: d.last4, network: d.network as CardInput["network"], limit_paise: sharing ? 0 : Math.round(limit * 100), shared_with: sharing ? d.sharedWith : initial ? "" : undefined, billing_day: day(d.billingDay), due_day: day(d.dueDay), apr,
    // editing: a blank clears the manual figure (negative); adding: simply leave it out
    outstanding_paise: outstanding === undefined ? (initial ? -1 : undefined) : Math.round(outstanding * 100),
  });

  return (
    <Modal title={initial ? "Edit card" : "Add card"} subtitle={initial ? initial.name : "Track limit, billing cycle and spends"} icon={CreditCard} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); if (ok) onSave(build()); }} className="space-y-5">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Card type">
          {KINDS.map(({ kind: k, label, hint, icon: Icon }) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
              className={cn("flex items-start gap-2.5 border p-3 text-left transition-colors", kind === k ? "border-ink bg-tint" : "border-line hover:bg-hover")}>
              <Icon size={20} weight={kind === k ? "fill" : "regular"} className={cn("mt-0.5 shrink-0", kind === k ? "text-ink" : "text-muted")} />
              <span><span className="block text-[13px] font-semibold">{label}</span><span className="text-[11px] leading-snug text-muted">{hint}</span></span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Name" icon={Tag} className="col-span-2"><Input value={d.name} onChange={set("name")} placeholder={spec.placeholder} autoFocus={!initial} /></FormField>
          <FormField label="Bank" icon={Bank} hint="Optional"><Input value={d.bank} onChange={set("bank")} placeholder="HDFC" /></FormField>
          <FormField label="Last 4 digits" icon={Hash} hint="Links your SMS to this card"><Input value={d.last4} onChange={set("last4")} inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="1234" /></FormField>
          <FormField label="Card network" icon={CreditCard} hint="Shown on the card" className="col-span-2">
            <Select value={d.network} onChange={set("network")}><option value="">Not set</option><option value="visa">Visa</option><option value="mastercard">Mastercard</option><option value="rupay">RuPay</option><option value="amex">American Express</option><option value="diners">Diners Club</option></Select>
          </FormField>
        </div>

        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Limit &amp; billing</p>
          <div className="grid grid-cols-2 gap-4">
            {owners.length > 0 && (
              <FormField label="Shares limit with" icon={ShareNetwork} className="col-span-2"
                hint={hasSharers ? `${initial!.shared_cards.join(", ")} draws on this card's limit, so it cannot share another card's` : "Two cards from one bank often share one limit. Pick the card that holds it."}>
                <Select value={d.sharedWith} onChange={set("sharedWith")} disabled={hasSharers}>
                  <option value="">Own limit</option>
                  {owners.map((c) => <option key={c.id} value={c.id}>{c.name}{c.bank && ` · ${c.bank}`}{c.last4 && ` ••${c.last4}`}</option>)}
                </Select>
              </FormField>
            )}
            {sharing
              ? <p className="col-span-2 flex items-start gap-2 bg-tint p-3 text-[12px] text-sub"><ShareNetwork size={15} className="mt-px shrink-0 text-muted" />This card uses the limit of {cards.find((c) => c.id === d.sharedWith)?.name ?? "the other card"}. Spends on both count against it.</p>
              : <FormField label="Credit limit (₹)" icon={Gauge} className="col-span-2"><Input type="number" min={0} step="any" value={d.limit} onChange={set("limit")} placeholder="100000" /></FormField>}
            <FormField label="Billing date" icon={Receipt} hint="Day the statement is generated"><Input type="number" min={1} max={31} value={d.billingDay} onChange={set("billingDay")} placeholder="15" /></FormField>
            <FormField label="Last date to pay" icon={CalendarCheck} hint="Payment due day"><Input type="number" min={1} max={31} value={d.dueDay} onChange={set("dueDay")} placeholder="5" /></FormField>
            <FormField label="Interest rate (% a year)" icon={Gauge} className="col-span-2" hint="Used to estimate interest on an unpaid bill. Blank assumes 42%"><Input type="number" min={0} max={100} step="any" value={d.apr} onChange={set("apr")} placeholder="42" /></FormField>
            <FormField label="Outstanding per app (₹)" icon={Wallet} className="col-span-2"
              hint={kind === "paylater" ? "Pay later SMS rarely carry a card number, so enter what the app shows" : "Optional. Overrides the estimate worked out from your transactions"}>
              <Input type="number" min={0} step="any" value={d.outstanding} onChange={set("outstanding")} />
            </FormField>
          </div>
        </div>

        <div className="flex gap-2 border-t border-line pt-4">
          <Button type="submit" loading={pending} disabled={!ok} className={cn(!ok && "opacity-50")}>{initial ? "Save changes" : "Add card"}</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
