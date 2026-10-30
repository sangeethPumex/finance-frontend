"use client";

import { useState } from "react";
import { Bank, CalendarBlank, CurrencyInr, Note, Receipt } from "@phosphor-icons/react";
import { api, useAccounts, useAct, type Card } from "@/lib/api";
import { inr, rupeesToPaise } from "@/lib/money";
import { Button, Input, Select } from "../atoms";
import { FormField, Modal } from "../molecules";

const todayIst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

/**
 * Record a bill payment by hand. It is a payment record only: no bank transaction is created, so spending and balances stay as they are.
 * Payments that arrive by SMS and are marked "Credit card payments" in Transactions are counted without doing this.
 */
export function RecordPaymentDialog({ card: c, onClose }: { card: Card; onClose: () => void }) {
  const act = useAct();
  const accounts = useAccounts().data ?? [];
  const st = c.statement;
  // What the payment is against: the open statement when there is one, else everything outstanding.
  const owed = st && st.status !== "paid" && st.status !== "no_due" ? st.unpaid_paise : c.used_paise;
  const [amount, setAmount] = useState(owed > 0 ? String(owed / 100) : "");
  const [date, setDate] = useState(todayIst());
  const [account, setAccount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const paise = rupeesToPaise(amount);
  const ok = paise !== null && paise > 0 && date !== "" && date <= todayIst();
  const left = Math.max(owed - (paise ?? 0), 0);

  const submit = () => {
    if (!ok) return;
    setSaving(true);
    act(() => api(`/cards/${c.id}/payments`, { method: "POST", body: { amount_paise: paise, paid_at: new Date(`${date}T00:00:00+05:30`).toISOString(), account_id: account, note } }),
      { ok: "Payment recorded", onDone: onClose, onSettled: () => setSaving(false) });
  };

  return (
    <Modal title="Record payment" subtitle={c.name} icon={Receipt} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-5">
        <div className="grid grid-cols-2 gap-3 bg-tint p-4 text-[12px]">
          <div><div className="text-muted">{st && st.status !== "paid" && st.status !== "no_due" ? "Statement due" : "Outstanding"}</div><div className="num mt-1 text-[18px] font-semibold">{inr(owed)}</div></div>
          <div><div className="text-muted">Remaining after this</div><div className="num mt-1 text-[18px] font-semibold text-up">{paise ? inr(left) : "–"}</div></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Amount paid (₹)" icon={CurrencyInr} hint="Less than the due amount is a partial payment"><Input type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></FormField>
          <FormField label="Payment date" icon={CalendarBlank}><Input type="date" max={todayIst()} value={date} onChange={(e) => setDate(e.target.value)} /></FormField>
          <FormField label="Paid from" icon={Bank} hint="Optional" className="col-span-2">
            <Select value={account} onChange={(e) => setAccount(e.target.value)}><option value="">Not specified</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}{a.last4 && ` ••${a.last4}`}</option>)}</Select>
          </FormField>
          <FormField label="Note" icon={Note} hint="Optional" className="col-span-2"><Input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Paid from the card app" /></FormField>
        </div>
        <p className="text-[12px] text-muted">This records the payment against the card only. It does not add a bank transaction, so your spending and account balances do not change.</p>
        <div className="flex gap-2 border-t border-line pt-4">
          <Button type="submit" loading={saving} disabled={!ok} className={ok ? "" : "opacity-50"}>Confirm payment</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
