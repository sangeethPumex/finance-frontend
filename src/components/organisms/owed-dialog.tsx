"use client";

import { useState } from "react";
import { CurrencyInr, HandCoins, User } from "@phosphor-icons/react";
import { api, useAct, type Txn } from "@/lib/api";
import { inr, rupeesToPaise } from "@/lib/money";
import { vendorLabel } from "@/lib/txn";
import { Button, Input } from "../atoms";
import { FormField, Modal } from "../molecules";

/** Records that someone owes part of a payment back (paid for a friend). Totals then leave that part out of the user's spending. */
export function OwedDialog({ txn, onClose }: { txn: Txn; onClose: () => void }) {
  const act = useAct();
  const [from, setFrom] = useState(txn.owed_from ?? "");
  const [amount, setAmount] = useState(String((txn.owed_paise ?? txn.amount_paise) / 100));
  const paise = rupeesToPaise(amount);
  const ok = from.trim() !== "" && paise !== null && paise > 0 && paise <= txn.amount_paise;
  const save = (owed: { from: string; paise: number }, ok: string) => act(() => api(`/transactions/${txn.id}`, { method: "PATCH", body: { owed } }), { ok, onDone: onClose });

  return (
    <Modal title={txn.owed_paise ? "Edit who owes you" : "Paid for someone?"} subtitle={`${vendorLabel(txn)} · ${inr(txn.amount_paise)}`} icon={HandCoins} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); if (ok) save({ from: from.trim(), paise: paise! }, "Saved"); }} className="space-y-4">
        <FormField label="Who owes you" icon={User}><Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Ravi" autoFocus /></FormField>
        <FormField label="How much (₹)" icon={CurrencyInr} hint={`Up to ${inr(txn.amount_paise)}. This part stops counting as your spending`}>
          <Input type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </FormField>
        <div className="flex gap-2 border-t border-line pt-4">
          <Button type="submit" disabled={!ok}>Save</Button>
          {txn.owed_paise ? <Button variant="ghost" onClick={() => save({ from: "", paise: 0 }, "Removed")}>Not owed after all</Button> : null}
        </div>
      </form>
    </Modal>
  );
}
