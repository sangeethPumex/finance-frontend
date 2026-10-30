"use client";

import { PencilSimple, Target, Trash } from "@phosphor-icons/react";
import { Badge, Button, CategoryLabel } from "@/components/atoms";
import { Card, EmptyState, Meter, RowList, RowSkeleton, StatCard, StatSkeleton } from "@/components/molecules";
import { CreateForm, type FieldDef } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { api, type BudgetStatus, useAct, useBudgets, useCategories, useWrite } from "@/lib/api";
import { inr, rupeesToPaise } from "@/lib/money";

const TONE = { ok: "good", warn: "warn", over: "bad" } as const;
const LABEL = { ok: "", warn: "Nearly there", over: "Over budget" } as const;

export default function Budgets() {
  const budgets = useBudgets(), cats = useCategories(), act = useAct();
  const save = useWrite(({ id, paise }: { id: string; paise: number }) => api(`/budgets/${id}`, { method: "PUT", body: { limit_paise: paise } }));
  const name = (id: string) => cats.data?.find((c) => c.id === id)?.name ?? "Category";
  const rows = budgets.data ?? [];
  const alerts = rows.filter((b) => b.level !== "ok");
  const limit = rows.reduce((a, b) => a + b.limit_paise, 0), spent = rows.reduce((a, b) => a + b.spent_paise, 0);

  const fields: FieldDef[] = [
    { name: "category", type: "select", placeholder: "Category", required: true, options: (cats.data ?? []).map((c) => ({ value: c.id, label: c.name })) },
    { name: "limit", placeholder: "Monthly limit ₹", required: true, inputMode: "decimal" },
  ];
  const change = (b: BudgetStatus) => {
    const p = rupeesToPaise(window.prompt(`New monthly limit for ${name(b.category_id)} (₹)`, String(b.limit_paise / 100)) ?? "");
    if (p && p > 0) act(() => api(`/budgets/${b.category_id}`, { method: "PUT", body: { limit_paise: p } }), { ok: "Limit changed" });
  };

  return (
    <PageLayout title="Budgets" icon={Target} error={budgets.error} description="A monthly limit per category. Money friends owe back and split payments are counted fairly">
      <CreateForm className="mb-6" fields={fields} pending={save.isPending} error={save.error} submitLabel="Set budget"
        onSubmit={(v, done) => {
          const paise = rupeesToPaise(v.limit);
          if (!paise || paise <= 0) return "Enter the limit in rupees";
          save.mutate({ id: v.category, paise }, { onSuccess: done });
        }} />

      {alerts.length > 0 && (
        <div className="mb-4 space-y-1 border border-warn bg-warn-bg px-5 py-3 text-[13px] text-warn" role="status">
          {alerts.map((b) => <p key={b.id}>{name(b.category_id)}: {b.level === "over" ? `over by ${inr(b.spent_paise - b.limit_paise)}` : `${Math.round(b.ratio * 100)}% used, ${inr(b.limit_paise - b.spent_paise)} left`}</p>)}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-3">
        {budgets.isLoading ? [0, 1].map((i) => <StatSkeleton key={i} />) : <>
          <StatCard label="Spent this month" value={inr(spent)} sub={limit > 0 ? `of ${inr(limit)} budgeted` : "No budgets yet"} />
          <StatCard label="Left to spend" value={inr(Math.max(limit - spent, 0))} tone={alerts.length > 0 ? "warn" : "good"} />
        </>}
      </div>

      {budgets.isLoading ? <RowSkeleton /> : rows.length === 0 ? (
        <div className="border border-line"><EmptyState icon={Target}>Pick a category and a monthly limit to start. You will be alerted at 80% and 100%</EmptyState></div>
      ) : (
        <Card>
          <RowList>
            {rows.map((b) => (
              <li key={b.id} className="py-3">
                <div className="flex items-center gap-3">
                  <CategoryLabel className="flex-1 font-medium" name={name(b.category_id)} icon={cats.data?.find((c) => c.id === b.category_id)?.icon} />
                  {b.level !== "ok" && <Badge variant={b.level === "over" ? "bad" : "warn"}>{LABEL[b.level]}</Badge>}
                  <span className="num shrink-0 text-[13px]">{inr(b.spent_paise)} <span className="text-muted">of {inr(b.limit_paise)}</span></span>
                  <Button variant="quiet" size="icon" icon={PencilSimple} aria-label={`Change ${name(b.category_id)} limit`} onClick={() => change(b)} />
                  <Button variant="quiet" size="icon" icon={Trash} aria-label={`Delete ${name(b.category_id)} budget`}
                    onClick={() => confirm(`Remove the ${name(b.category_id)} budget?`) && act(() => api(`/budgets/${b.category_id}`, { method: "DELETE" }), { ok: "Budget removed" })} />
                </div>
                <div className="mt-2"><Meter ratio={b.ratio} tone={TONE[b.level]} /></div>
              </li>
            ))}
          </RowList>
        </Card>
      )}
    </PageLayout>
  );
}
