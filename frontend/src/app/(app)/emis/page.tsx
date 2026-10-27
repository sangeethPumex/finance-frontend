"use client";

import { useState } from "react";
import { Calendar, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/atoms";
import { EmptyState, RowSkeleton, StatCard, StatSkeleton } from "@/components/molecules";
import { EmiCard, EmiForm } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { api, type EmiInput, type EmiView, useAct, useEmis } from "@/lib/api";
import { inr } from "@/lib/money";

const rs = (n: number) => inr(Math.round(n * 100));

export default function Emis() {
  const q = useEmis();
  const act = useAct();
  // undefined = closed, null = adding, EmiView = editing
  const [form, setForm] = useState<EmiView | null | undefined>(undefined);
  const items = q.data?.items ?? [], s = q.data?.summary;

  const save = (input: EmiInput) =>
    act(() => (form ? api(`/emis/${form.id}`, { method: "PUT", body: input }) : api("/emis", { method: "POST", body: input })), { ok: form ? "Loan updated" : "Loan added", onDone: () => setForm(undefined) });

  return (
    <PageLayout title="EMIs" icon={Calendar} error={q.error} action={<Button icon={Plus} disabled={!q.isSuccess} onClick={() => setForm(null)}>Add loan</Button>}>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {q.isLoading ? [0, 1, 2, 3].map((i) => <StatSkeleton key={i} />) : <>
        <StatCard label="Monthly EMIs" value={rs(s?.monthly ?? 0)} sub={`${s?.activeCount ?? 0} active loan${s?.activeCount === 1 ? "" : "s"}`} />
        <StatCard label="Outstanding" value={rs(s?.outstanding ?? 0)} sub="Across active loans" />
        <StatCard label="Paid So Far" value={rs(s?.paidSoFar ?? 0)} tone={(s?.paidSoFar ?? 0) > 0 ? "good" : "neutral"} sub={s && s.principalPaid + s.interestPaid > 0 ? `${rs(s.principalPaid)} principal · ${rs(s.interestPaid)} interest` : undefined} />
        <StatCard label="Next Payment" value={s?.next ? rs(s.next.amount) : "–"} tone={s?.next && s.next.days <= 7 ? "warn" : "neutral"} sub={s?.next ? `${s.next.name} · in ${s.next.days} day${s.next.days === 1 ? "" : "s"}` : "Nothing due"} />
        </>}
      </div>

      <div className="mt-4 space-y-3">
        {q.isLoading ? (
          <><RowSkeleton /><RowSkeleton /></>
        ) : items.length === 0 ? (
          <div className="border border-line py-10">
            <EmptyState icon={Calendar}>Track car loans, phone EMIs and card balances to see how they shape your runway.</EmptyState>
            <div className="mt-4 flex justify-center"><Button icon={Plus} onClick={() => setForm(null)}>Add your first loan</Button></div>
          </div>
        ) : (
          items.map((e) => <EmiCard key={e.id} emi={e} onEdit={() => setForm(e)} />)
        )}
      </div>

      {form !== undefined && <EmiForm key={form?.id ?? "new"} initial={form ?? undefined} onSave={save} onClose={() => setForm(undefined)} />}
    </PageLayout>
  );
}
