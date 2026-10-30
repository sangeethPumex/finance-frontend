"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowsLeftRight, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/atoms";
import { AddTransactionDialog, Pager, TransactionsFilters, TransactionsTable } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { type Sort, type TxnFilter, useAccounts, useCards, useCategories, useTransactionsPage } from "@/lib/api";

const SIZES = [25, 50, 100, 200];

function Transactions() {
  // Old links to ?review=1 open with the review filter on.
  const review = useSearchParams().get("review") === "1";
  const [filter, setFilterState] = useState<TxnFilter>(() => (review ? { status: "review" } : {}));
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(50);
  const [sort, setSort] = useState<Sort | undefined>();
  const [adding, setAdding] = useState(false);
  const setFilter = (f: TxnFilter) => { setFilterState(f); setPage(1); };
  // Click a column: ascending, then descending, then back to newest first.
  const toggleSort = (field: string) => { setSort((o) => (o?.field !== field ? { field, dir: "asc" } : o.dir === "asc" ? { field, dir: "desc" } : undefined)); setPage(1); };
  const searching = Object.values(filter).some(Boolean);
  const txns = useTransactionsPage(filter, page, size, sort);
  const { items = [], pages = 1, total = 0 } = txns.data ?? {};
  useEffect(() => { if (txns.data && page > Math.max(pages, 1)) setPage(Math.max(pages, 1)); }, [txns.data, page, pages]); // the last row of a page was just categorised away
  const accounts = useAccounts(), cards = useCards(), cats = useCategories();

  return (
    <PageLayout
      title="Transactions"
      icon={ArrowsLeftRight}
      error={txns.error}
      action={<Button icon={Plus} onClick={() => setAdding(true)}>Add transaction</Button>}
    >
      <TransactionsFilters value={filter} onChange={setFilter} accounts={accounts.data ?? []} cards={cards.data ?? []} categories={cats.data ?? []} />
      <TransactionsTable
        txns={items}
        accounts={accounts.data ?? []}
        cards={cards.data ?? []}
        categories={cats.data ?? []}
        loading={txns.isLoading}
        sort={sort}
        onSort={toggleSort}
        emptyText={searching ? "No transactions match these filters" : "No transactions yet"}
      />
      <Pager page={page} pages={pages} total={total} limit={size} onPage={setPage} onLimit={(n) => { setSize(n); setPage(1); }} sizes={SIZES} />
      {adding && <AddTransactionDialog onClose={() => setAdding(false)} />}
    </PageLayout>
  );
}

export default function Page() {
  return <Suspense><Transactions /></Suspense>;
}
