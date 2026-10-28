"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowsLeftRight } from "@phosphor-icons/react";
import { Tabs } from "@/components/molecules";
import { TransactionsFilters, TransactionsTable } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { type TxnFilter, useAccounts, useCards, useCategories, useTransactions } from "@/lib/api";

type View = "all" | "review";
const VIEWS: { value: View; label: string }[] = [{ value: "all", label: "All" }, { value: "review", label: "Needs Review" }];

function Transactions() {
  const router = useRouter();
  const review = useSearchParams().get("review") === "1";
  const [filter, setFilter] = useState<TxnFilter>({});
  const searching = Object.values(filter).some(Boolean);
  // A search looks through more than the latest page.
  const txns = useTransactions({ ...filter, needs_review: review || undefined }, searching ? 500 : 100);
  const accounts = useAccounts(), cards = useCards(), cats = useCategories();

  return (
    <PageLayout
      title="Transactions"
      icon={ArrowsLeftRight}
      error={txns.error}
      action={<Tabs<View> value={review ? "review" : "all"} items={VIEWS} onChange={(v) => router.push(v === "review" ? "/transactions?review=1" : "/transactions")} />}
    >
      <TransactionsFilters value={filter} onChange={setFilter} accounts={accounts.data ?? []} categories={cats.data ?? []} />
      <TransactionsTable
        txns={txns.data ?? []}
        accounts={accounts.data ?? []}
        cards={cards.data ?? []}
        categories={cats.data ?? []}
        loading={txns.isLoading}
        emptyText={searching ? "No transactions match these filters" : review ? "Nothing to review" : "No transactions yet"}
      />
    </PageLayout>
  );
}

export default function Page() {
  return <Suspense><Transactions /></Suspense>;
}
