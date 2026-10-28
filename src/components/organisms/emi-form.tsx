"use client";

import { useState } from "react";
import { Calendar, CalendarCheck, CurrencyInr, Car, CreditCard, DeviceMobile, ListNumbers, Percent, PiggyBank, Receipt, Tag, Wallet } from "@phosphor-icons/react";
import { useCards, type EmiInput, type EmiKind, type EmiView } from "@/lib/api";
import { cn } from "@/lib/cn";
import { inr } from "@/lib/money";
import { Button, Input, Select } from "../atoms";
import { FormField, Modal } from "../molecules";

export const KIND_ICON = { loan: Car, purchase: DeviceMobile, card: CreditCard } as const;
export const KIND_LABEL: Record<EmiKind, string> = { loan: "Loan", purchase: "Fixed instalments", card: "Credit card" };
const KIND_HINT: Record<EmiKind, string> = {
  loan: "Car, home or personal loan. Interest accrues on the principal, so extra payments help.",
  purchase: "A phone, laptop or other purchase split into fixed instalments.",
  card: "A credit card balance you pay down each month.",
};

type Draft = { name: string; amount: string; dueDay: string; total: string; paid: string; rate: string; balance: string; original: string; cardId: string; rateType: string };
const str = (n?: number) => (n === undefined ? "" : String(n));
const toDraft = (e?: EmiView): Draft => ({ name: e?.name ?? "", amount: str(e?.amount), dueDay: str(e?.dueDay), total: e?.total ? str(e.total) : "", paid: e ? str(e.paid) : "", rate: str(e?.rate), balance: str(e?.balance), original: str(e?.original), cardId: e?.cardId ?? "", rateType: e?.rateType ?? "variable" });
const opt = (v: string) => (v.trim() === "" ? undefined : Number(v));

/** Add or edit an EMI: pick a type, fill the essentials (details are optional), review, save. The backend validates and stores it. */
export function EmiForm({ initial, onSave, onClose }: { initial?: EmiView; onSave: (e: EmiInput) => void; onClose: () => void }) {
  const [kind, setKind] = useState<EmiKind | null>(initial?.kind ?? null);
  const [step, setStep] = useState<"details" | "review">("details");
  const [d, setD] = useState<Draft>(toDraft(initial));
  const cards = useCards().data ?? [];
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });

  const isCard = kind === "card";
  const amount = Number(d.amount), dueDay = Math.round(Number(d.dueDay)), total = isCard ? 0 : Math.round(Number(d.total)), paid = Math.round(Number(d.paid) || 0);
  const balance = opt(d.balance), rate = opt(d.rate), original = opt(d.original);
  const ok = d.name.trim() !== "" && amount > 0 && dueDay >= 1 && dueDay <= 31 &&
    (isCard ? balance !== undefined && balance >= 0 : total > 0 && paid >= 0 && paid <= total) &&
    [balance, rate, original].every((v) => v === undefined || (Number.isFinite(v) && v >= 0));

  const build = (): EmiInput => ({ name: d.name.trim(), kind: kind!, amount, dueDay, total, paid: isCard ? 0 : paid, rate: kind === "loan" ? rate : undefined, rateType: kind === "loan" && rate !== undefined ? (d.rateType as "fixed" | "variable") : undefined, balance, original, cardId: !isCard && d.cardId ? d.cardId : undefined });
  const rows: [string, string][] = [
    ["Type", KIND_LABEL[kind ?? "purchase"]], ["Monthly payment", inr(amount * 100)], ["Due day", `${dueDay}th`],
    ...(isCard ? [] : [["Instalments", `${paid} of ${total} paid`] as [string, string]]),
    ...(balance !== undefined ? [[isCard ? "Card balance" : kind === "loan" ? "Outstanding principal" : "Amount left", inr(balance * 100)] as [string, string]] : []),
    ...(rate !== undefined && kind === "loan" ? [["Interest rate", `${rate}% a year, ${d.rateType}`] as [string, string]] : []),
    ...(!isCard && d.cardId ? [["Charged to card", cards.find((c) => c.id === d.cardId)?.name ?? "Card"] as [string, string]] : []),
    ...(original !== undefined ? [[kind === "loan" ? "Original loan" : "Purchase price", inr(original * 100)] as [string, string]] : []),
  ];

  return (
    <Modal title={initial ? "Edit loan" : "Add loan"} subtitle={kind === null ? "Choose what you are paying off" : step === "review" ? "Check the details, then save" : KIND_LABEL[kind]} icon={kind ? KIND_ICON[kind] : Calendar} onClose={onClose}>
      {kind === null ? (
        <div className="space-y-2">
          <p className="mb-3 text-[13px] font-medium text-sub">What kind of payment is it?</p>
          {(Object.keys(KIND_LABEL) as EmiKind[]).map((k) => {
            const Icon = KIND_ICON[k];
            return (
              <button key={k} type="button" onClick={() => setKind(k)} className="flex w-full items-start gap-3 border border-line p-4 text-left hover:bg-hover">
                <Icon size={22} weight="duotone" className="mt-0.5 text-ink" />
                <span><span className="block text-[14px] font-semibold">{KIND_LABEL[k]}</span><span className="text-[12px] text-muted">{KIND_HINT[k]}</span></span>
              </button>
            );
          })}
        </div>
      ) : step === "review" ? (
        <div>
          <p className="mb-2 text-[18px] font-semibold tracking-tight">{d.name.trim()}</p>
          <dl className="mb-5 divide-y divide-line-soft text-[13px]">
            {rows.map(([k, v]) => <div key={k} className="flex justify-between py-2"><dt className="text-muted">{k}</dt><dd className="num font-semibold">{v}</dd></div>)}
          </dl>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep("details")}>Edit</Button>
            <Button onClick={() => onSave(build())}>{initial ? "Save changes" : "Add loan"}</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (ok) setStep("review"); }} className="space-y-4">
          <FormField label="Name" icon={Tag}><Input value={d.name} onChange={set("name")} placeholder={kind === "loan" ? "Car loan" : kind === "card" ? "HDFC card" : "Phone"} autoFocus /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label={isCard ? "Minimum due (₹)" : "Monthly payment (₹)"} icon={CurrencyInr}><Input type="number" min={0} step="any" value={d.amount} onChange={set("amount")} /></FormField>
            <FormField label="Due day (1-31)" icon={CalendarCheck}><Input type="number" min={1} max={31} value={d.dueDay} onChange={set("dueDay")} /></FormField>
            {isCard ? (
              <FormField label="Current balance (₹)" icon={Wallet} className="col-span-2"><Input type="number" min={0} step="any" value={d.balance} onChange={set("balance")} /></FormField>
            ) : (
              <>
                <FormField label="Total instalments" icon={ListNumbers}><Input type="number" min={1} value={d.total} onChange={set("total")} /></FormField>
                <FormField label="Already paid" icon={Receipt}><Input type="number" min={0} value={d.paid} onChange={set("paid")} placeholder="0" /></FormField>
              </>
            )}
          </div>
          {!isCard && cards.length > 0 && (
            <FormField label="Charged to card" icon={CreditCard} hint="Optional. Counts against that card's limit">
              <Select value={d.cardId} onChange={set("cardId")}>
                <option value="">Not on a card</option>
                {cards.map((c) => <option key={c.id} value={c.id}>{c.name}{c.last4 && ` ••${c.last4}`}</option>)}
              </Select>
            </FormField>
          )}
          {!isCard && (
            <details className="border border-line p-4" open={!!initial && (initial.balance !== undefined || initial.rate !== undefined)}>
              <summary className="flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-sub"><PiggyBank size={15} className="text-muted" />Loan details (optional)</summary>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <FormField label={kind === "loan" ? "Outstanding principal (₹)" : "Amount still to pay (₹)"} hint="From your latest statement"><Input type="number" min={0} step="any" value={d.balance} onChange={set("balance")} /></FormField>
                <FormField label={kind === "loan" ? "Original loan (₹)" : "Purchase price (₹)"}><Input type="number" min={0} step="any" value={d.original} onChange={set("original")} /></FormField>
                {kind === "loan" && <FormField label="Interest rate (% a year)" icon={Percent} hint="Enables the schedule and extra-payment estimates"><Input type="number" min={0} step="any" value={d.rate} onChange={set("rate")} /></FormField>}
                {kind === "loan" && (
                  <FormField label="Rate type" hint="Variable: the lender can reset it. Change the rate here when it does">
                    <Select value={d.rateType} onChange={set("rateType")}><option value="variable">Variable</option><option value="fixed">Fixed</option></Select>
                  </FormField>
                )}
              </div>
            </details>
          )}
          <div className="flex gap-2 border-t border-line pt-4">
            {!initial && <Button variant="ghost" onClick={() => setKind(null)}>Back</Button>}
            <Button type="submit" disabled={!ok} className={cn(!ok && "opacity-50")}>Review</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
