"use client";

import { useState } from "react";
import { Car, CreditCard, DeviceMobile } from "@phosphor-icons/react";
import type { EmiInput, EmiKind, EmiView } from "@/lib/api";
import { cn } from "@/lib/cn";
import { inr } from "@/lib/money";
import { Button, Input } from "../atoms";
import { FormField, Modal } from "../molecules";

export const KIND_ICON = { loan: Car, purchase: DeviceMobile, card: CreditCard } as const;
export const KIND_LABEL: Record<EmiKind, string> = { loan: "Variable-rate loan", purchase: "Fixed instalments", card: "Credit card" };
const KIND_HINT: Record<EmiKind, string> = {
  loan: "Car, home or personal loan. Interest accrues on the principal, so extra payments help.",
  purchase: "A phone, laptop or other purchase split into fixed instalments.",
  card: "A credit card balance you pay down each month.",
};

type Draft = { name: string; amount: string; dueDay: string; total: string; paid: string; rate: string; balance: string; original: string };
const str = (n?: number) => (n === undefined ? "" : String(n));
const toDraft = (e?: EmiView): Draft => ({ name: e?.name ?? "", amount: str(e?.amount), dueDay: str(e?.dueDay), total: e?.total ? str(e.total) : "", paid: e ? str(e.paid) : "", rate: str(e?.rate), balance: str(e?.balance), original: str(e?.original) });
const opt = (v: string) => (v.trim() === "" ? undefined : Number(v));

/** Add or edit an EMI: pick a type, fill the essentials (details are optional), review, save. The backend validates and stores it. */
export function EmiForm({ initial, onSave, onClose }: { initial?: EmiView; onSave: (e: EmiInput) => void; onClose: () => void }) {
  const [kind, setKind] = useState<EmiKind | null>(initial?.kind ?? null);
  const [step, setStep] = useState<"details" | "review">("details");
  const [d, setD] = useState<Draft>(toDraft(initial));
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => setD({ ...d, [k]: e.target.value });

  const isCard = kind === "card";
  const amount = Number(d.amount), dueDay = Math.round(Number(d.dueDay)), total = isCard ? 0 : Math.round(Number(d.total)), paid = Math.round(Number(d.paid) || 0);
  const balance = opt(d.balance), rate = opt(d.rate), original = opt(d.original);
  const ok = d.name.trim() !== "" && amount > 0 && dueDay >= 1 && dueDay <= 31 &&
    (isCard ? balance !== undefined && balance >= 0 : total > 0 && paid >= 0 && paid <= total) &&
    [balance, rate, original].every((v) => v === undefined || (Number.isFinite(v) && v >= 0));

  const build = (): EmiInput => ({ name: d.name.trim(), kind: kind!, amount, dueDay, total, paid: isCard ? 0 : paid, rate: kind === "loan" ? rate : undefined, balance, original });
  const rows: [string, string][] = [
    ["Type", KIND_LABEL[kind ?? "purchase"]], ["Monthly payment", inr(amount * 100)], ["Due day", `${dueDay}th`],
    ...(isCard ? [] : [["Instalments", `${paid} of ${total} paid`] as [string, string]]),
    ...(balance !== undefined ? [[isCard ? "Card balance" : kind === "loan" ? "Outstanding principal" : "Amount left", inr(balance * 100)] as [string, string]] : []),
    ...(rate !== undefined && kind === "loan" ? [["Interest rate", `${rate}% a year`] as [string, string]] : []),
    ...(original !== undefined ? [[kind === "loan" ? "Original loan" : "Purchase price", inr(original * 100)] as [string, string]] : []),
  ];

  return (
    <Modal title={initial ? "Edit loan" : "Add loan"} onClose={onClose}>
      {kind === null ? (
        <div className="space-y-2">
          <p className="mb-3 text-[13px] text-muted">What kind of payment is it?</p>
          {(Object.keys(KIND_LABEL) as EmiKind[]).map((k) => {
            const Icon = KIND_ICON[k];
            return (
              <button key={k} type="button" onClick={() => setKind(k)} className="flex w-full items-start gap-3 border border-line p-4 text-left hover:bg-hover">
                <Icon size={20} className="mt-0.5 text-muted" />
                <span><span className="block font-medium">{KIND_LABEL[k]}</span><span className="text-[12px] text-muted">{KIND_HINT[k]}</span></span>
              </button>
            );
          })}
        </div>
      ) : step === "review" ? (
        <div>
          <p className="mb-1 font-medium">{d.name.trim()}</p>
          <dl className="mb-5 divide-y divide-line-soft text-[13px]">
            {rows.map(([k, v]) => <div key={k} className="flex justify-between py-2"><dt className="text-muted">{k}</dt><dd className="num">{v}</dd></div>)}
          </dl>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep("details")}>Edit</Button>
            <Button onClick={() => onSave(build())}>{initial ? "Save changes" : "Add loan"}</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (ok) setStep("review"); }} className="space-y-4">
          <FormField label="Name"><Input value={d.name} onChange={set("name")} placeholder={kind === "loan" ? "Car loan" : kind === "card" ? "HDFC card" : "Phone"} autoFocus /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label={isCard ? "Minimum due (₹)" : "Monthly payment (₹)"}><Input type="number" min={0} step="any" value={d.amount} onChange={set("amount")} /></FormField>
            <FormField label="Due day (1-31)"><Input type="number" min={1} max={31} value={d.dueDay} onChange={set("dueDay")} /></FormField>
            {isCard ? (
              <FormField label="Current balance (₹)" className="col-span-2"><Input type="number" min={0} step="any" value={d.balance} onChange={set("balance")} /></FormField>
            ) : (
              <>
                <FormField label="Total instalments"><Input type="number" min={1} value={d.total} onChange={set("total")} /></FormField>
                <FormField label="Already paid"><Input type="number" min={0} value={d.paid} onChange={set("paid")} placeholder="0" /></FormField>
              </>
            )}
          </div>
          {!isCard && (
            <details className="border border-line p-4" open={!!initial && (initial.balance !== undefined || initial.rate !== undefined)}>
              <summary className="cursor-pointer text-[13px] text-sub">Loan details (optional)</summary>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <FormField label={kind === "loan" ? "Outstanding principal (₹)" : "Amount still to pay (₹)"} hint="From your latest statement"><Input type="number" min={0} step="any" value={d.balance} onChange={set("balance")} /></FormField>
                <FormField label={kind === "loan" ? "Original loan (₹)" : "Purchase price (₹)"}><Input type="number" min={0} step="any" value={d.original} onChange={set("original")} /></FormField>
                {kind === "loan" && <FormField label="Interest rate (% a year)" hint="Enables extra-payment estimates"><Input type="number" min={0} step="any" value={d.rate} onChange={set("rate")} /></FormField>}
              </div>
            </details>
          )}
          <div className="flex gap-2">
            {!initial && <Button variant="ghost" onClick={() => setKind(null)}>Back</Button>}
            <Button type="submit" disabled={!ok} className={cn(!ok && "opacity-50")}>Review</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
