"use client";

import Link from "next/link";
import { Bank } from "@phosphor-icons/react";
import { api, useWrite, type Account } from "@/lib/api";
import { bankName } from "@/lib/banks";
import { localToIso, shortDate } from "@/lib/dates";
import { inr, rupeesToPaise } from "@/lib/money";
import { BankLogo } from "../atoms";
import { DataTable, type Column } from "./data-table";
import { EditDialog } from "./edit-dialog";

/** Edits every account field; the balance is recomputed from the opening balance and the moment it was true. */
export function EditAccount({ a }: { a: Account }) {
  const save = useWrite((body: object) => api(`/accounts/${a.id}`, { method: "PATCH", body }));
  return (
    <EditDialog
      title={`Edit ${a.name}`}
      pending={save.isPending}
      error={save.error}
      fields={[
        { name: "name", label: "Name", defaultValue: a.name, required: true },
        { name: "bank", label: "Bank", defaultValue: bankName(a.bank), required: true },
        { name: "last4", label: "Last 4", defaultValue: a.last4, pattern: "[0-9]{4}", maxLength: 4, required: true },
        { name: "balance", label: "Opening balance (₹)", defaultValue: String(a.opening_balance_paise / 100), inputMode: "decimal", required: true },
        { name: "at", label: "Balance as of (empty keeps current)", type: "datetime-local" },
      ]}
      onSave={(v, done) => {
        const paise = rupeesToPaise(v.balance);
        if (paise === null) return "Invalid amount";
        save.mutate({ name: v.name, bank: v.bank, last4: v.last4, opening_balance_paise: paise, opening_at: localToIso(v.at) ?? a.opening_at }, { onSuccess: done });
      }}
    />
  );
}

const columns: Column<Account>[] = [
  { key: "name", header: "Account", cell: (a) => <Link href={`/accounts/${a.id}`} className="group flex items-center gap-3"><BankLogo bank={a.bank} /><span className="group-hover:underline">{a.name}{bankName(a.bank).toLowerCase() !== a.name.trim().toLowerCase() && <span className="text-muted"> {bankName(a.bank)}</span>}</span></Link> },
  { key: "opening", header: "Opening", cell: (a) => <span className="text-muted">{inr(a.opening_balance_paise)} on {shortDate(a.opening_at)}</span> },
  { key: "balance", header: "Balance", align: "right", cell: (a) => <span className="num font-medium text-ink">{inr(a.balance_paise)}</span> },
  { key: "edit", header: "", align: "right", cell: (a) => <EditAccount a={a} /> },
];

export function AccountsTable({ accounts, loading }: { accounts: Account[]; loading?: boolean }) {
  return <DataTable columns={columns} rows={accounts} rowKey={(a) => a.id} loading={loading} emptyIcon={Bank} emptyText="Add your first account to start tracking balances" />;
}
