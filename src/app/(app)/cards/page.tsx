"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarCheck, CreditCard, Gauge, Plus, Wallet } from "@phosphor-icons/react";
import { Button } from "@/components/atoms";
import { EmptyState, RowSkeleton, StatCard, StatSkeleton } from "@/components/molecules";
import { CardForm, CardTile, dueStatus } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { api, type Card, type CardInput, useAct, useCards } from "@/lib/api";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/dates";
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
  // Real dues: statements with something still unpaid, soonest first. A paid statement is not a payment to make.
  const dues = cards.flatMap((c) => (c.statement && dueStatus(c)?.open ? [{ card: c, st: c.statement }] : [])).sort((a, b) => a.st.due_date.localeCompare(b.st.due_date));
  const next = dues[0];
  const owing = dues.reduce((t, d) => t + d.st.unpaid_paise, 0);
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
          <StatCard label="Outstanding" icon={Wallet} value={inr(used)} tone={util >= 0.7 ? "bad" : util >= 0.3 ? "warn" : "neutral"} sub={limit > 0 ? `${Math.round(util * 100)}% of your limit` : "Add limits to see usage"} />
          <StatCard label="Available" icon={CreditCard} value={inr(Math.max(limit - used, 0))} tone={limit > 0 ? "good" : "neutral"} sub="Left to spend across cards" />
          <StatCard label="Next Payment" icon={CalendarCheck} value={next ? inr(next.st.unpaid_paise) : inr(0)} tone={next ? (next.st.status === "overdue" ? "bad" : next.st.days_to_due <= 7 ? "warn" : "neutral") : "good"}
            sub={next ? `${next.card.name}, ${next.st.status === "overdue" ? "overdue" : `by ${shortDate(next.st.due_date)}`}` : "No statement is waiting to be paid"} />
        </>}
      </div>

      {dues.length > 0 && (
        <section className="mt-6 border border-line bg-surface">
          <div className="flex items-baseline justify-between border-b border-line bg-tint px-4 py-2.5 sm:px-6"><h2 className="text-[13px] font-semibold">Upcoming payments</h2><span className="num text-[12px] text-muted">{inr(owing)} across {dues.length} statement{dues.length === 1 ? "" : "s"}</span></div>
          <ul className="divide-y divide-line-soft">
            {dues.map(({ card: c, st }) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
                <span className="min-w-0"><span className="block truncate text-[14px] font-medium">{c.name}</span><span className={cn("block text-[12px]", st.status === "overdue" ? "text-down" : "text-muted")}>{st.status === "overdue" ? `Overdue since ${shortDate(st.due_date)}` : `Due ${shortDate(st.due_date)}`}{st.paid_paise > 0 && ` · ${inr(st.paid_paise)} already paid`}</span></span>
                <span className="num shrink-0 text-[16px] font-semibold">{inr(st.unpaid_paise)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
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
