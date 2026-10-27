"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowsLeftRight } from "@phosphor-icons/react";
import { Tabs } from "@/components/molecules";
import { TransactionsTable } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { useAccounts, useCards, useCategories, useTransactions } from "@/lib/api";

type View = "all" | "review";
const VIEWS: { value: View; label: string }[] = [{ value: "all", label: "All" }, { value: "review", label: "Needs Review" }];

function Transactions() {
  const router = useRouter();
  const review = useSearchParams().get("review") === "1";
  const txns = useTransactions(review || undefined);
  const accounts = useAccounts(), cards = useCards(), cats = useCategories();

  return (
    <PageLayout
      title="Transactions"
      icon={ArrowsLeftRight}
      error={txns.error}
      action={<Tabs<View> value={review ? "review" : "all"} items={VIEWS} onChange={(v) => router.push(v === "review" ? "/transactions?review=1" : "/transactions")} />}
    >
      <TransactionsTable
        txns={txns.data ?? []}
        accounts={accounts.data ?? []}
        cards={cards.data ?? []}
        categories={cats.data ?? []}
        loading={txns.isLoading}
        emptyText={review ? "Nothing to review" : "No transactions yet"}
      />
    </PageLayout>
  );
}

export default function Page() {
  return <Suspense><Transactions /></Suspense>;
}
