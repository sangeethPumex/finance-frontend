"use client";

import { CreditCard } from "@phosphor-icons/react";
import { CardsTable, CreateForm, type FieldDef } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { api, useCards, useWrite } from "@/lib/api";

const FIELDS: FieldDef[] = [
  { name: "name", placeholder: "Name (e.g. HDFC Regalia)", required: true },
  { name: "bank", placeholder: "Bank (optional)" },
  { name: "last4", placeholder: "Last 4 (optional)", pattern: "[0-9]{4}", maxLength: 4, className: "w-36" },
];

export default function Page() {
  const { data, error, isLoading } = useCards();
  const add = useWrite((body: object) => api("/cards", { method: "POST", body }));
  return (
    <PageLayout title="Cards" icon={CreditCard} error={error}>
      <CreateForm className="mb-6" collapsible triggerLabel="New Card" fields={FIELDS} pending={add.isPending} error={add.error}
        onSubmit={(v, done) => { add.mutate(v, { onSuccess: done }); }} />
      <CardsTable cards={data ?? []} loading={isLoading} />
    </PageLayout>
  );
}
