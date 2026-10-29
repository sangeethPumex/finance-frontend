"use client";

import { Clock, Lightbulb } from "@phosphor-icons/react";
import { Card, PanelSkeleton, StatCard, StatSkeleton } from "@/components/molecules";
import { AnomalyList, RecurringList, WeekdayBars } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { useInsights, useMandates } from "@/lib/api";
import { inr } from "@/lib/money";

export default function Insights() {
  const q = useInsights(), d = q.data;
  const mandates = useMandates().data;
  const active = d?.recurring.filter((r) => r.status === "active") ?? [];
  // A detected charge counts as tracked when a mandate has a similar name (either contains the other).
  const tracked = (name: string) => (mandates?.items ?? []).some((m) => { const a = m.name.toLowerCase(), b = name.toLowerCase(); return a.includes(b) || b.includes(a); });
  const untracked = active.filter((r) => !tracked(r.name));
  const perMonth = { monthly: 1, quarterly: 1 / 3, yearly: 1 / 12, "one-off": 0 };
  const mandateMonthly = Math.round((mandates?.items ?? []).reduce((a, m) => a + m.amount_paise * perMonth[m.frequency], 0));
  return (
    <PageLayout title="Insights" icon={Lightbulb} error={q.error} description="Patterns found in your last year of spending">
      {!d ? (
        <div className="space-y-4"><div className="grid grid-cols-2 gap-4 xl:grid-cols-3">{[0, 1, 2].map((i) => <StatSkeleton key={i} />)}</div><PanelSkeleton /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
            <StatCard label="Mandates per month" href="/mandates" value={inr(mandateMonthly)} sub={mandates ? `${inr(mandates.year_paise)} over the next year · ${mandates.items.length} tracked` : "Loading…"} />
            <StatCard label="Detected, not in Mandates" href="/mandates" value={String(untracked.length)} tone={untracked.length > 0 ? "warn" : "good"}
              sub={untracked.length > 0 ? `${inr(untracked.reduce((a, r) => a + r.monthly_paise, 0))} a month you may want to add` : `All ${active.length} detected charges are tracked`} />
            <StatCard label="Payments to check" value={String(d.anomalies.length)} tone={d.anomalies.length > 0 ? "warn" : "good"} />
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <AnomalyList items={d.anomalies} />
            <RecurringList items={d.recurring} monthlyPaise={d.monthly_paise} tracked={tracked} />
          </div>
          <div className="mt-4">
            <Card title="When you spend" icon={Clock}><WeekdayBars patterns={d.patterns} /></Card>
          </div>
        </>
      )}
    </PageLayout>
  );
}
