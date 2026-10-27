"use client";

import { ArrowDownLeft, ArrowUpRight, Bank, ListBullets } from "@phosphor-icons/react";
import type { Account, TxnView } from "@/lib/api";
import { bankName } from "@/lib/banks";
import { shortDateTime } from "@/lib/dates";
import { inr } from "@/lib/money";
import { BankLogo } from "../atoms";
import { Card, EmptyState, ListRow, RowList } from "../molecules";

export function AccountBalances({ accounts, className }: { accounts: Account[]; className?: string }) {
  return (
    <Card title="Accounts" icon={Bank} className={className}>
      {accounts.length === 0 ? (
        <EmptyState icon={Bank}>No accounts yet</EmptyState>
      ) : (
        <RowList>
          {accounts.map((a) => <ListRow key={a.id} leading={<BankLogo bank={a.bank} />} title={a.name} subtitle={bankName(a.bank)} trailing={inr(a.balance_paise)} />)}
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
              leading={<span className={`grid size-8 shrink-0 place-items-center rounded-full ${t.credit ? "bg-gain-bg text-gain" : "bg-loss-bg text-loss"}`}>{t.credit ? <ArrowDownLeft size={16} weight="bold" /> : <ArrowUpRight size={16} weight="bold" />}</span>}
              trailing={<span className={t.credit ? "text-gain" : "text-loss"}>{t.credit ? "+" : "-"}{inr(t.paise)}</span>} />)}
        </RowList>
      )}
    </Card>
  );
}
