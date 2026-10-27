"use client";

import { CreditCard } from "@phosphor-icons/react";
import type { Card } from "@/lib/api";
import { DataTable, type Column } from "./data-table";

const muted = (s?: string) => <span className="text-muted">{s || "—"}</span>;

const columns: Column<Card>[] = [
  { key: "name", header: "Name", cell: (c) => c.name },
  { key: "bank", header: "Bank", cell: (c) => muted(c.bank) },
  { key: "last4", header: "Last 4", cell: (c) => muted(c.last4 && `••${c.last4}`) },
];

export function CardsTable({ cards, loading }: { cards: Card[]; loading?: boolean }) {
  return <DataTable columns={columns} rows={cards} rowKey={(c) => c.id} loading={loading} emptyIcon={CreditCard} emptyText="No cards yet" />;
}
