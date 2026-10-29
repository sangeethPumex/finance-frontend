"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowsLeftRight, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/components/atoms";
import { TransactionsFilters, TransactionsTable } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { type TxnFilter, useAccounts, useCards, useCategories, useTransactionsPage } from "@/lib/api";

const PAGE_SIZE = 50;

function Transactions() {
  // Old links to ?review=1 open with the review filter on.
  const review = useSearchParams().get("review") === "1";
  const [filter, setFilterState] = useState<TxnFilter>(() => (review ? { status: "review" } : {}));
  const [page, setPage] = useState(1);
  const setFilter = (f: TxnFilter) => { setFilterState(f); setPage(1); };
  const searching = Object.values(filter).some(Boolean);
  const txns = useTransactionsPage(filter, page, PAGE_SIZE);
  const { items = [], pages = 1, total = 0 } = txns.data ?? {};
  useEffect(() => { if (txns.data && page > Math.max(pages, 1)) setPage(Math.max(pages, 1)); }, [txns.data, page, pages]); // the last row of a page was just categorised away
  const accounts = useAccounts(), cards = useCards(), cats = useCategories();

  return (
    <PageLayout
      title="Transactions"
      icon={ArrowsLeftRight}
      error={txns.error}
    >
      <TransactionsFilters value={filter} onChange={setFilter} accounts={accounts.data ?? []} categories={cats.data ?? []} />
      <TransactionsTable
        txns={items}
        accounts={accounts.data ?? []}
        cards={cards.data ?? []}
        categories={cats.data ?? []}
        loading={txns.isLoading}
        emptyText={searching ? "No transactions match these filters" : "No transactions yet"}
      />
      {total > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3 text-[13px] text-muted">
          <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" icon={CaretLeft} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="num">Page {page} of {pages}</span>
            <Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next <CaretRight size={14} /></Button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default function Page() {
  return <Suspense><Transactions /></Suspense>;
}
