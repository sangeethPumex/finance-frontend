"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarCheck, CreditCard, Gauge, Plus, Wallet } from "@phosphor-icons/react";
import { Button } from "@/components/atoms";
import { EmptyState, RowSkeleton, StatCard, StatSkeleton } from "@/components/molecules";
import { CardForm, CardTile } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { api, type Card, type CardInput, useAct, useCards } from "@/lib/api";
import { inr } from "@/lib/money";

function Cards() {
  const open = useSearchParams().get("card"); // from a transaction's card link: open that card's details
  const q = useCards();
  const act = useAct();
  const [saving, setSaving] = useState(false);
  // undefined = closed, null = adding, Card = editing
  const [form, setForm] = useState<Card | null | undefined>(undefined);
  const cards = q.data ?? [];

  // a card that shares carries its owner's limit, so only owners add to the total or the limit would count twice
  const limit = cards.reduce((t, c) => t + (c.shared_with ? 0 : c.limit_paise ?? 0), 0);
  const used = cards.filter((c) => c.limit_paise).reduce((t, c) => t + c.used_paise, 0);
  const next = cards.flatMap((c) => (c.days_to_due !== undefined ? [{ name: c.name, days: c.days_to_due }] : [])).sort((a, b) => a.days - b.days)[0];
  const util = limit > 0 ? used / limit : 0;

  const save = (input: CardInput) => {
    setSaving(true);
    act(() => (form ? api(`/cards/${form.id}`, { method: "PATCH", body: input }) : api("/cards", { method: "POST", body: input })), {
      ok: form ? "Card updated" : "Card added", onDone: () => setForm(undefined), onSettled: () => setSaving(false),
    });
  };

  return (
    <PageLayout title="Credit Cards" icon={CreditCard} error={q.error} action={<Button icon={Plus} disabled={!q.isSuccess} onClick={() => setForm(null)}>Add card</Button>}>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {q.isLoading ? [0, 1, 2, 3].map((i) => <StatSkeleton key={i} />) : <>
          <StatCard label="Total Limit" icon={Gauge} value={inr(limit)} sub={`${cards.length} card${cards.length === 1 ? "" : "s"} and pay-later lines`} />
          <StatCard label="Used" icon={Wallet} value={inr(used)} tone={util >= 0.7 ? "bad" : util >= 0.3 ? "warn" : "neutral"} sub={limit > 0 ? `${Math.round(util * 100)}% of your limit` : "Add limits to see usage"} />
          <StatCard label="Available" icon={CreditCard} value={inr(Math.max(limit - used, 0))} tone={limit > 0 ? "good" : "neutral"} sub="Left to spend across cards" />
          <StatCard label="Next Due" icon={CalendarCheck} value={next ? (next.days === 1 ? "Tomorrow" : `${next.days} days`) : "–"} tone={next && next.days <= 7 ? "warn" : "neutral"} sub={next?.name ?? "Add last dates to pay"} />
        </>}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {q.isLoading ? (
          <><RowSkeleton /><RowSkeleton /></>
        ) : cards.length === 0 ? (
          <div className="border border-line py-10 lg:col-span-2">
            <EmptyState icon={CreditCard}>Add your credit cards and pay-later lines to see limits, billing dates and what each one has spent.</EmptyState>
            <div className="mt-4 flex justify-center"><Button icon={Plus} onClick={() => setForm(null)}>Add your first card</Button></div>
          </div>
        ) : (
          cards.map((c) => <CardTile key={c.id} card={c} defaultOpen={c.id === open} onEdit={() => setForm(c)} />)
        )}
      </div>

      {form !== undefined && <CardForm key={form?.id ?? "new"} initial={form ?? undefined} pending={saving} onSave={save} onClose={() => setForm(undefined)} />}
    </PageLayout>
  );
}

export default function Page() {
  return <Suspense><Cards /></Suspense>;
}
