"use client";

import { Bank } from "@phosphor-icons/react";
import { AccountsTable, CreateForm, type FieldDef } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { api, useAccounts, useWrite } from "@/lib/api";
import { localToIso } from "@/lib/dates";
import { rupeesToPaise } from "@/lib/money";

const FIELDS: FieldDef[] = [
  { name: "name", placeholder: "Name (e.g. Federal Savings)", label: "Name", required: true },
  { name: "bank", placeholder: "Bank as in the SMS (e.g. Federal Bank)", label: "Bank", required: true },
  { name: "last4", placeholder: "Last 4 digits", label: "Last 4", pattern: "[0-9]{4}", maxLength: 4, required: true },
  { name: "balance", placeholder: "Current balance in ₹", label: "Balance", inputMode: "decimal" },
  { name: "at", type: "datetime-local", label: "Balance as of (empty means now)", span: 2 },
];

export default function Page() {
  const { data, error, isLoading } = useAccounts();
  const add = useWrite((body: object) => api("/accounts", { method: "POST", body }));
  return (
    <PageLayout title="Accounts" icon={Bank} error={error}>
      <CreateForm
        className="mb-6"
        layout="grid"
        collapsible
        triggerLabel="New Account"
        submitLabel="Add Account"
        fields={FIELDS}
        pending={add.isPending}
        error={add.error}
        onSubmit={(v, done) => {
          const paise = rupeesToPaise(v.balance || "0");
          if (paise === null) return "Balance must be a number like 9635.93";
          add.mutate({ name: v.name, bank: v.bank, last4: v.last4, opening_balance_paise: paise, opening_at: localToIso(v.at) }, { onSuccess: done });
        }}
      />
      <AccountsTable accounts={data ?? []} loading={isLoading} />
    </PageLayout>
  );
}
