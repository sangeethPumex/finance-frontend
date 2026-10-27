"use client";

import { useState } from "react";
import { ArrowsLeftRight } from "@phosphor-icons/react";
import { api, useWrite, type Account, type Card, type Category, type Txn } from "@/lib/api";
import { shortDateTime } from "@/lib/dates";
import { inr } from "@/lib/money";
import { signed, sourceLabel, vendorLabel } from "@/lib/txn";
import { Button, Select } from "../atoms";
import { InlineError } from "../molecules";
import { DataTable, type Column } from "./data-table";

/** Files an unknown-vendor transaction: creates a vendor with this payee as its alias. */
function ReviewCell({ t, categories }: { t: Txn; categories: Category[] }) {
  const [cat, setCat] = useState(t.suggested_category_id ?? "");
  const save = useWrite(() =>
    api("/vendors", { method: "POST", body: { name: vendorLabel(t), category_id: cat, aliases: [(t.upi_id || t.raw_vendor || "").toLowerCase()] } }));
  return (
    <span className="flex items-center gap-1.5">
      <Select size="sm" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
        <option value="">Category…</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <Button size="sm" disabled={!cat} loading={save.isPending} onClick={() => save.mutate(undefined)}>Save</Button>
      <InlineError error={save.error} />
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
};

export function TransactionsTable({ txns, accounts, cards, categories, loading, emptyText = "No transactions yet" }: TransactionsTableProps) {
  const columns: Column<Txn>[] = [
    { key: "date", header: "Date", cell: (t) => <span className="whitespace-nowrap text-muted">{shortDateTime(t.received_at ?? t.occurred_at)}</span> },
    { key: "vendor", header: "Vendor", cell: (t) => vendorLabel(t) },
    {
      key: "category",
      header: "Category",
      cell: (t) => t.needs_review
        ? <ReviewCell t={t} categories={categories} />
        : <span className="text-muted">{categories.find((c) => c.id === t.category_id)?.name ?? "—"}</span>,
    },
    { key: "account", header: "Account", cell: (t) => <span className="text-muted">{sourceLabel(t, accounts, cards)}</span> },
    { key: "amount", header: "Amount", align: "right", cell: (t) => <span className="num">{signed(t) > 0 ? "+" : ""}{inr(signed(t))}</span> },
  ];
  return <DataTable columns={columns} rows={txns} rowKey={(t) => t.id} loading={loading} emptyIcon={ArrowsLeftRight} emptyText={emptyText} />;
}
