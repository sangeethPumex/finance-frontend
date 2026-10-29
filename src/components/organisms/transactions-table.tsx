"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowsLeftRight, ArrowUpRight, ArrowUUpLeft, CalendarCheck, CreditCard, HandCoins, Money, PencilSimple, SplitHorizontal, type Icon } from "@phosphor-icons/react";
import { api, TXN_KEYS, useTxnCache, useVendors, useWrite, type Account, type Card, type Category, type Txn } from "@/lib/api";
import { shortDateTime } from "@/lib/dates";
import { inr } from "@/lib/money";
import { cn } from "@/lib/cn";
import { isDebit, signed, sourceLabel, vendorLabel } from "@/lib/txn";
import { Button, Select } from "../atoms";
import { OwedDialog } from "./owed-dialog";
import { SplitDialog } from "./split-dialog";
import { InlineError } from "../molecules";
import { DataTable, type Column, type DataTableProps } from "./data-table";

const TYPE_ICON: Record<string, Icon> = { atm: Money, emi: CalendarCheck, card_bill_payment: CreditCard, refund: ArrowUUpLeft };

/** Round badge: red up-arrow for money out, green down-arrow for money in; special types get their own glyph. */
function DirectionBadge({ t }: { t: Txn }) {
  const debit = isDebit(t);
  const Glyph = TYPE_ICON[t.type] ?? (debit === false ? ArrowDownLeft : debit ? ArrowUpRight : ArrowsLeftRight);
  const tone = debit === false ? "bg-gain-bg text-gain" : debit ? "bg-loss-bg text-loss" : "bg-tint text-muted";
  return <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", tone)}><Glyph size={16} weight="bold" /></span>;
}

/** Files an unknown-vendor transaction: creates a vendor with this payee as its alias. */
function ReviewCell({ t, categories }: { t: Txn; categories: Category[] }) {
  const [cat, setCat] = useState(t.suggested_category_id ?? "");
  const setTxn = useTxnCache();
  const save = useWrite(() =>
    api("/vendors", { method: "POST", body: { name: vendorLabel(t), category_id: cat, aliases: [(t.upi_id || t.raw_vendor || "").toLowerCase()] } }), ["vendors", ...TXN_KEYS]);
  return (
    <span className="flex items-center gap-1.5">
      <Select size="sm" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
        <option value="">Category…</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <Button size="sm" disabled={!cat} loading={save.isPending} onClick={() => { setTxn(t.id, { category_id: cat, needs_review: false }); save.mutate(undefined); }}>Save</Button>
      <InlineError error={save.error} />
    </span>
  );
}

const CARD_PAYMENTS = "Credit card payments";

/**
 * Category of one transaction. Dropdowns show only while a choice is missing (no category, or a card payment without its card) or while
 * editing; once settled it reads as text with a pencil. Under "Credit card payments" money going out also names the card it paid.
 */
function CategoryCell({ t, categories, cards, onSplit }: { t: Txn; categories: Category[]; cards: Card[]; onSplit: () => void }) {
  const [editing, setEditing] = useState(false);
  const setTxn = useTxnCache();
  const patch = useWrite((body: { category_id?: string; paid_card_id?: string }) => api(`/transactions/${t.id}`, { method: "PATCH", body }), TXN_KEYS);
  const cat = categories.find((c) => c.id === t.category_id);
  const needsCard = cat?.name === CARD_PAYMENTS && isDebit(t) !== false;
  const card = cards.find((c) => c.id === t.paid_card_id);
  if (t.splits?.length) {
    const names = t.splits.map((s) => categories.find((c) => c.id === s.category_id)?.name ?? "?").join(" + ");
    return <button type="button" title="Edit split" onClick={onSplit} className="text-left text-muted hover:text-ink">Split: {names}</button>;
  }
  const pickCategory = !cat || editing, pickCard = needsCard && (!card || editing);
  const done = () => setEditing(false);

  if (!pickCategory && !pickCard) {
    return (
      <span className="flex items-center gap-1.5 text-muted">
        {cat?.name}{needsCard && card && <> → <span className="font-medium text-ink">{card.name}{card.last4 && ` ••${card.last4}`}</span></>}
        <button type="button" aria-label="Change category" onClick={() => setEditing(true)} className="text-muted hover:text-ink"><PencilSimple size={13} /></button>
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {pickCategory && (
        <Select size="sm" value={t.category_id ?? ""} disabled={patch.isPending} aria-label="Category"
          onChange={(e) => { if (!e.target.value) return; setTxn(t.id, { category_id: e.target.value }); patch.mutate({ category_id: e.target.value }, { onSuccess: () => categories.find((c) => c.id === e.target.value)?.name !== CARD_PAYMENTS && done() }); }}>
          {!t.category_id && <option value="">Category…</option>}
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      )}
      {pickCard && (
        <Select size="sm" value={t.paid_card_id ?? ""} disabled={patch.isPending} aria-label="Card paid" onChange={(e) => { if (!e.target.value) return; setTxn(t.id, { paid_card_id: e.target.value }); patch.mutate({ paid_card_id: e.target.value }, { onSuccess: done }); }}>
          <option value="">Which card?</option>
          {cards.map((c) => <option key={c.id} value={c.id}>{c.name}{c.last4 && ` ••${c.last4}`}</option>)}
        </Select>
      )}
      {editing && <button type="button" onClick={done} className="text-[11px] text-muted hover:text-ink">Cancel</button>}
      <InlineError error={patch.error} />
    </span>
  );
}

export type TransactionsTableProps = {
  txns: Txn[];
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  loading?: boolean;
  emptyText?: string;
  sort?: DataTableProps<Txn>["sort"];
  onSort?: (field: string) => void;
};

export function TransactionsTable({ txns, accounts, cards, categories, loading, emptyText = "No transactions yet", sort, onSort }: TransactionsTableProps) {
  const [owing, setOwing] = useState<Txn | null>(null);
  const [splitting, setSplitting] = useState<Txn | null>(null);
  const vendors = useVendors().data;
  const names = useMemo(() => new Map((vendors ?? []).map((v) => [v.id, v.name])), [vendors]);
  // A saved vendor's name beats the raw UPI id / SMS text.
  const nameOf = (t: Txn) => (t.vendor_id && names.get(t.vendor_id)) || vendorLabel(t);
  const columns: Column<Txn>[] = [
    { key: "date", header: "Date", sortKey: "date", cell: (t) => <span className="whitespace-nowrap text-muted">{shortDateTime(t.received_at ?? t.occurred_at)}</span> },
    {
      key: "vendor",
      header: "Vendor",
      sortKey: "vendor",
      cell: (t) => <span className="flex items-center gap-3"><DirectionBadge t={t} /><span className="font-medium text-ink">{nameOf(t)}</span></span>,
    },
    {
      key: "category",
      header: "Category",
      cell: (t) => t.needs_review
        ? <ReviewCell t={t} categories={categories} />
        : <CategoryCell t={t} categories={categories} cards={cards} onSplit={() => setSplitting(t)} />,
    },
    { key: "account", header: "Account", cell: (t) => <span className="text-muted">{sourceLabel(t, accounts, cards)}</span> },
    { key: "amount", header: "Amount", sortKey: "amount", align: "right", cell: (t) => <span className={cn("num font-medium", isDebit(t) === false ? "text-gain" : isDebit(t) ? "text-loss" : "text-sub")}>{signed(t) > 0 ? "+" : ""}{inr(signed(t))}</span> },
    {
      key: "owed",
      header: "",
      cell: (t) => t.owed_paise
        ? <button type="button" onClick={() => setOwing(t)} className="whitespace-nowrap text-[12px] font-medium text-warn hover:underline">{t.owed_from} owes {inr(t.owed_paise - (t.repaid_paise ?? 0))}</button>
        : isDebit(t) ? (
          <span className="flex items-center gap-2.5">
            <button type="button" aria-label="Split across categories" title="Split across categories" onClick={() => setSplitting(t)} className={cn("hover:text-ink", t.splits?.length ? "text-ink" : "text-muted")}><SplitHorizontal size={16} /></button>
            {!t.splits?.length && <button type="button" aria-label="Mark as paid for someone" title="Paid for someone? Track what they owe you" onClick={() => setOwing(t)} className="text-muted hover:text-ink"><HandCoins size={16} /></button>}
          </span>
        ) : null,
    },
  ];
  return (
    <>
      <DataTable columns={columns} rows={txns} rowKey={(t) => t.id} loading={loading} sort={sort} onSort={onSort} emptyIcon={ArrowsLeftRight} emptyText={emptyText} />
      {owing && <OwedDialog key={owing.id} txn={owing} onClose={() => setOwing(null)} />}
      {splitting && <SplitDialog key={splitting.id} txn={splitting} onClose={() => setSplitting(null)} />}
    </>
  );
}
