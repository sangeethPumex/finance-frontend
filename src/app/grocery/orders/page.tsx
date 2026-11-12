"use client";

import { useState } from "react";
import { ArrowsClockwise, CaretLeft, CaretRight, Receipt } from "@phosphor-icons/react";
import { Button } from "@/components/atoms";
import { Card, EmptyState, RowSkeleton, StatCard, StatSkeleton } from "@/components/molecules";
import { GROCERY_SOURCES, GroceryOrderList, SyncProblems, plural, useGrocerySync } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { type GrocerySource, useGroceryMonth } from "@/lib/api";
import { addMonths } from "@/lib/dates";
import { inr } from "@/lib/money";

const thisMonth = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7); // YYYY-MM in IST
const label = (m: string) => new Date(+m.slice(0, 4), +m.slice(5) - 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

export default function PantryOrders() {
  const [m, setM] = useState(thisMonth);
  const month = useGroceryMonth(m), sync = useGrocerySync(), data = month.data, orders = data?.orders ?? [];
  const step = (n: number) => setM(addMonths(`${m}-01`, n).slice(0, 7));

  return (
    <PageLayout title="Orders" icon={Receipt} error={month.error} description={`Your saved Swiggy Instamart and Food orders for ${label(m)}. Cancelled orders are not counted`}
      action={
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-line bg-surface">
            <Button variant="quiet" size="icon" icon={CaretLeft} aria-label="Previous month" onClick={() => step(-1)} />
            <span className="min-w-[8.5rem] text-center text-[13px] font-medium">{label(m)}</span>
            <Button variant="quiet" size="icon" icon={CaretRight} aria-label="Next month" disabled={m >= thisMonth()} onClick={() => step(1)} />
          </div>
          <Button icon={ArrowsClockwise} loading={sync.pending} onClick={sync.run}>Sync from Swiggy</Button>
        </div>
      }>
      <SyncProblems problems={sync.problems} />
      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-3">
        {!data ? [0, 1, 2].map((i) => <StatSkeleton key={i} />) : <>
          <StatCard label="Spent" value={inr(data.total_paise)} sub={plural(data.spend.instamart.count + data.spend.food.count, "order")} />
          {(Object.keys(GROCERY_SOURCES) as GrocerySource[]).map((s) => (
            <StatCard key={s} label={GROCERY_SOURCES[s].label} value={inr(data.spend[s].paise)} icon={GROCERY_SOURCES[s].icon} sub={plural(data.spend[s].count, "order")} />
          ))}
        </>}
      </div>
      <Card title="Orders" icon={Receipt}>
        {!data ? <RowSkeleton /> : orders.length === 0
          ? <EmptyState icon={Receipt}>No saved orders for {label(m)}. Use Sync from Swiggy to pull the latest</EmptyState>
          : <GroceryOrderList orders={orders} />}
      </Card>
    </PageLayout>
  );
}
