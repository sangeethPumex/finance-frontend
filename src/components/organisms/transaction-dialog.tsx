"use client";

import { useState } from "react";
import { ArrowsLeftRight, Bank, CalendarBlank, CreditCard, CurrencyInr, HandCoins, Hash, Note, PencilSimple, Plus, Storefront, Tag } from "@phosphor-icons/react";
import { api, type Txn, useAccounts, useAct, useCards, useCategories, useVendors } from "@/lib/api";
import { isoToLocal, localToIso } from "@/lib/dates";
import { inr, rupeesToPaise } from "@/lib/money";
import { Button, Input, Select } from "../atoms";
import { DatePicker, FormField, Modal } from "../molecules";

const TYPES = [
  { value: "expense", label: "Expense", hint: "A purchase or bill" },
  { value: "income", label: "Income", hint: "Salary, interest or money received" },
  { value: "transfer", label: "Transfer", hint: "Between your own accounts" },
  { value: "card_bill_payment", label: "Card bill payment", hint: "Paying a credit card" },
  { value: "refund", label: "Refund", hint: "Money back from a purchase" },
  { value: "atm", label: "ATM withdrawal", hint: "Cash taken out" },
  { value: "emi", label: "EMI", hint: "A loan instalment" },
] as const;
type Type = (typeof TYPES)[number]["value"];

const DEBIT: Type[] = ["expense", "atm", "emi"], CREDIT: Type[] = ["income", "refund"];
const nowLocal = () => isoToLocal(new Date().toISOString());

/**
 * Add a transaction by hand (for cash, a payment with no SMS, or one the parser missed), or, given txn, correct one that exists: a wrong
 * amount, day, account or payee. An edit sends only the date, account and payee that changed, so an SMS keeps the details it came with.
 * Category, split and who owes you stay on the transaction row.
 */
export function TransactionDialog({ txn, onClose }: { txn?: Txn; onClose: () => void }) {
  const act = useAct();
  const accounts = useAccounts().data ?? [], cards = useCards().data ?? [], cats = useCategories().data ?? [], vendors = useVendors().data ?? [];
  const [start] = useState(() => ({
    when: txn ? isoToLocal(txn.received_at ?? txn.occurred_at) : nowLocal(),
    source: txn?.account_id ? `a:${txn.account_id}` : txn?.card_id ? `c:${txn.card_id}` : "", // "a:<id>" | "c:<id>" | ""
    vendor: txn ? (txn.vendor_id && vendors.find((v) => v.id === txn.vendor_id)?.name) || txn.raw_vendor || txn.upi_id || "" : "",
  }));
  const [type, setType] = useState<Type>(TYPES.some((t) => t.value === txn?.type) ? (txn!.type as Type) : "expense");
  const [direction, setDirection] = useState<"debit" | "credit">(txn?.direction ?? "debit");
  const [amount, setAmount] = useState(txn ? String(txn.amount_paise / 100) : "");
  const [when, setWhen] = useState(start.when);
  const [source, setSource] = useState(start.source);
  const [vendor, setVendor] = useState(start.vendor);
  const [category, setCategory] = useState("");
  const [ref, setRef] = useState(txn?.ref ?? "");
  const [note, setNote] = useState(txn?.note ?? "");
  const [payCard, setPayCard] = useState("");
  const [owedFrom, setOwedFrom] = useState("");
  const [owed, setOwed] = useState("");
  const [saving, setSaving] = useState(false);

  const linked = !!txn?.paid_card_id, split = !!txn?.splits?.length, owedBack = txn?.owed_paise ?? 0;
  const dir = DEBIT.includes(type) ? "debit" : CREDIT.includes(type) ? "credit" : direction;
  const paise = rupeesToPaise(amount), owedPaise = owed.trim() === "" ? 0 : rupeesToPaise(owed);
  const fromCard = source.startsWith("c:");
  const pays = type === "card_bill_payment" && dir === "debit";
  const canOwe = !txn && dir === "debit" && type !== "transfer" && !pays;
  const tooLow = paise !== null && paise < owedBack;
  const bad = paise === null || paise <= 0 || tooLow || when === "" || owedPaise === null || (owedPaise > 0 && (owedFrom.trim() === "" || owedPaise > paise));
  const ok = !bad && (!pays || !fromCard);

  const submit = () => {
    if (!ok || paise === null) return;
    setSaving(true);
    const finish = { onDone: onClose, onSettled: () => setSaving(false) };
    const ids = { account_id: source.startsWith("a:") ? source.slice(2) : "", card_id: fromCard ? source.slice(2) : "" };
    if (txn) {
      act(() => api(`/transactions/${txn.id}`, { method: "PATCH", body: { edit: {
        type, direction: dir, amount_paise: paise, ref, note,
        ...(when !== start.when && { occurred_at: localToIso(when) }),
        ...(source !== start.source && { source: ids }),
        ...(vendor.trim() !== start.vendor && { vendor: vendor.trim() }),
      } } }), { ok: "Transaction updated", ...finish });
      return;
    }
    act(() => api("/transactions", { method: "POST", body: {
      type, direction: dir, amount_paise: paise, occurred_at: localToIso(when), ...ids,
      vendor, category_id: category, ref, note, paid_card_id: pays ? payCard : "",
      owed_from: canOwe ? owedFrom : "", owed_paise: canOwe ? owedPaise ?? 0 : 0,
    } }), { ok: "Transaction added", ...finish });
  };

  return (
    <Modal title={txn ? "Edit transaction" : "Add transaction"} subtitle={txn ? "Fix what the message got wrong. Totals update straight away." : "Record one yourself. It counts like any other."} icon={txn ? PencilSimple : Plus} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Type" icon={Tag} className={type === "transfer" || pays || type === "card_bill_payment" ? "" : "col-span-2"} hint={linked ? "Linked to a card: change its category to unlink" : TYPES.find((t) => t.value === type)?.hint}>
            <Select value={type} disabled={linked} onChange={(e) => setType(e.target.value as Type)}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select>
          </FormField>
          {(type === "transfer" || type === "card_bill_payment") && (
            <FormField label="Money" icon={ArrowsLeftRight}>
              <Select value={direction} disabled={linked} onChange={(e) => setDirection(e.target.value as "debit" | "credit")}><option value="debit">Went out</option><option value="credit">Came in</option></Select>
            </FormField>
          )}
          <FormField label="Amount (₹)" icon={CurrencyInr} hint={split ? "Remove the split to change the amount" : undefined} error={tooLow ? `Cannot be less than the ${inr(owedBack)} owed back` : undefined}>
            <Input type="number" min={0} step="any" value={amount} disabled={split} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </FormField>
          <FormField label="Date and time" icon={CalendarBlank}><DatePicker time value={when} onChange={setWhen} max={nowLocal()} aria-label="Date and time" /></FormField>
          <FormField label={dir === "debit" ? "Paid with" : "Received in"} icon={Bank} className="col-span-2" hint={fromCard && pays ? "A card cannot pay its own bill: pick an account" : "Leave as cash if it touched no account or card"}>
            <Select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">Cash or other</option>
              {accounts.length > 0 && <optgroup label="Accounts">{accounts.map((a) => <option key={a.id} value={`a:${a.id}`}>{a.name}{a.last4 && ` ••${a.last4}`}</option>)}</optgroup>}
              {cards.length > 0 && dir === "debit" && <optgroup label="Cards">{cards.map((c) => <option key={c.id} value={`c:${c.id}`}>{c.name}{c.last4 && ` ••${c.last4}`}</option>)}</optgroup>}
            </Select>
          </FormField>
          {pays && !txn && (
            <FormField label="Card being paid" icon={CreditCard} className="col-span-2" hint="Links this payment to the card's statement">
              <Select value={payCard} onChange={(e) => setPayCard(e.target.value)}><option value="">Not linked yet</option>{cards.map((c) => <option key={c.id} value={c.id}>{c.name}{c.last4 && ` ••${c.last4}`}</option>)}</Select>
            </FormField>
          )}
          <FormField label={dir === "debit" ? "Paid to" : "Received from"} icon={Storefront} hint="A known vendor fills the category for you">
            <Input list="manual-vendors" value={vendor} maxLength={100} onChange={(e) => setVendor(e.target.value)} placeholder="Swiggy" />
            <datalist id="manual-vendors">{vendors.map((v) => <option key={v.id} value={v.name} />)}</datalist>
          </FormField>
          {!pays && !txn && (
            <FormField label="Category" icon={Tag} hint="Optional">
              <Select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">From the vendor</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            </FormField>
          )}
          <FormField label="Reference" icon={Hash} hint="Optional, such as a UPI ref"><Input value={ref} maxLength={60} onChange={(e) => setRef(e.target.value)} /></FormField>
          <FormField label="Note" icon={Note} hint="Optional"><Input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} /></FormField>
        </div>

        {canOwe && (
          <fieldset className="border border-line p-4">
            <legend className="flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted"><HandCoins size={14} weight="bold" />Someone owes me part of this</legend>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Who"><Input value={owedFrom} maxLength={60} onChange={(e) => setOwedFrom(e.target.value)} placeholder="Ravi" /></FormField>
              <FormField label="Amount they owe (₹)" error={owedPaise !== null && paise !== null && owedPaise > paise ? `More than the payment (${inr(paise)})` : undefined}>
                <Input type="number" min={0} step="any" value={owed} onChange={(e) => setOwed(e.target.value)} />
              </FormField>
            </div>
            <p className="mt-2 text-[12px] text-muted">That part is left out of your own spending and shows under Owed to Me.</p>
          </fieldset>
        )}
        {txn && <p className="text-[12px] text-muted">Category, split and who owes you are changed from the transaction row.</p>}

        <div className="flex gap-2 border-t border-line pt-4">
          <Button type="submit" loading={saving} disabled={!ok} className={ok ? "" : "opacity-50"}>{txn ? "Save changes" : "Add transaction"}</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
