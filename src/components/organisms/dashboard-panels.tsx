"use client";

import { ArrowDownLeft, ArrowUpRight, Bank, ListBullets } from "@phosphor-icons/react";
import type { Account, TxnView } from "@/lib/api";
import { shortDateTime } from "@/lib/dates";
import { inr } from "@/lib/money";
import { Card, EmptyState, ListRow, RowList } from "../molecules";

export function AccountBalances({ accounts, className }: { accounts: Account[]; className?: string }) {
  return (
    <Card title="Accounts" icon={Bank} className={className}>
      {accounts.length === 0 ? (
        <EmptyState icon={Bank}>No accounts yet</EmptyState>
      ) : (
        <RowList>
          {accounts.map((a) => <ListRow key={a.id} leading={<span className="grid size-8 shrink-0 place-items-center rounded-md bg-info/10 text-info"><Bank size={16} weight="duotone" /></span>} title={a.name} subtitle={`${a.bank} ••${a.last4}`} trailing={inr(a.balance_paise)} />)}
        </RowList>
      )}
    </Card>
  );
}

/** The latest transactions of the selected period, already labelled by the backend. */
export function RecentActivity({ txns, className }: { txns: TxnView[]; className?: string }) {
  return (
    <Card title="Recent Activity" icon={ListBullets} className={className}>
      {txns.length === 0 ? (
        <EmptyState>No transactions in this period</EmptyState>
      ) : (
        <RowList>
          {[...txns].sort((a, b) => b.at.localeCompare(a.at)).map((t) => <ListRow key={t.id} title={t.vendor} subtitle={`${shortDateTime(t.at)}${t.source ? ` · ${t.source}` : ""}`}
              leading={<span className={`grid size-8 shrink-0 place-items-center rounded-md ${t.credit ? "bg-gain/10 text-gain" : "bg-tint text-sub"}`}>{t.credit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span>}
              trailing={<span className={t.credit ? "text-gain" : ""}>{t.credit ? "+" : "-"}{inr(t.paise)}</span>} />)}
        </RowList>
      )}
    </Card>
  );
}
