"use client";

import { useState } from "react";
import { Bank } from "@phosphor-icons/react";
import { api, useWrite, type Account } from "@/lib/api";
import { localToIso, shortDate } from "@/lib/dates";
import { inr, rupeesToPaise } from "@/lib/money";
import { Button, Input } from "../atoms";
import { InlineError } from "../molecules";
import { DataTable, type Column } from "./data-table";

/** Edits the opening balance and the moment it was true; the balance is recomputed from there. */
function EditBalance({ a }: { a: Account }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const save = useWrite((body: object) => api(`/accounts/${a.id}`, { method: "PATCH", body }));

  if (!open) return <Button variant="quiet" size="sm" onClick={() => setOpen(true)}>Edit</Button>;
  return (
    <form
      className="flex flex-wrap items-center justify-end gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const paise = rupeesToPaise(String(f.get("balance")));
        if (paise === null) return setErr("Invalid amount");
        setErr("");
        save.mutate({ opening_balance_paise: paise, opening_at: localToIso(String(f.get("at") ?? "")) ?? a.opening_at }, { onSuccess: () => setOpen(false) });
      }}
    >
      <Input size="sm" name="balance" defaultValue={String(a.opening_balance_paise / 100)} className="w-28" inputMode="decimal" aria-label="Opening balance in rupees" />
      <Input size="sm" name="at" type="datetime-local" aria-label="Balance as of" />
      <Button type="submit" size="sm" loading={save.isPending}>Save</Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      <InlineError error={err || save.error} />
    </form>
  );
}

const columns: Column<Account>[] = [
  { key: "name", header: "Account", cell: (a) => <span>{a.name} <span className="text-muted">{a.bank} ••{a.last4}</span></span> },
  { key: "opening", header: "Opening", cell: (a) => <span className="text-muted">{inr(a.opening_balance_paise)} on {shortDate(a.opening_at)}</span> },
  { key: "balance", header: "Balance", align: "right", cell: (a) => <span className="num font-medium text-ink">{inr(a.balance_paise)}</span> },
  { key: "edit", header: "", align: "right", cell: (a) => <EditBalance a={a} /> },
];

export function AccountsTable({ accounts, loading }: { accounts: Account[]; loading?: boolean }) {
  return <DataTable columns={columns} rows={accounts} rowKey={(a) => a.id} loading={loading} emptyIcon={Bank} emptyText="Add your first account to start tracking balances" />;
}
