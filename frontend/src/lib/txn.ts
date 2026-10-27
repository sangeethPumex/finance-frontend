import type { Account, Card, Txn } from "@/lib/api";

const OUT = ["expense", "atm", "emi", "card_bill_payment"];
const IN = ["income", "refund"];

/** True when money left the account. Direction wins; older rows fall back to type. */
export function isDebit(t: Txn): boolean | null {
  if (t.direction) return t.direction === "debit";
  if (OUT.includes(t.type)) return true;
  if (IN.includes(t.type)) return false;
  return null;
}

export const signed = (t: Txn) => (isDebit(t) === false ? t.amount_paise : -t.amount_paise);

/** Counts toward "spent": real spending, not transfers or card bill payments. */
export const isSpend = (t: Txn) => ["expense", "atm", "emi"].includes(t.type) && isDebit(t) !== false;

export const vendorLabel = (t: Txn) => t.raw_vendor || t.upi_id || "Unknown";

export function sourceLabel(t: Txn, accounts: Account[], cards: Card[]): string {
  const a = accounts.find((x) => x.id === t.account_id);
  if (a) return a.name;
  const c = cards.find((x) => x.id === t.card_id);
  if (c) return c.name;
  return t.account_last4 ? `${t.bank ?? "Bank"} ••${t.account_last4}` : "—";
}
