"use client";

import { useState } from "react";
import { Check, HandCoins } from "@phosphor-icons/react";
import { Badge, Button, Input } from "@/components/atoms";
import { Card, EmptyState, ListRow, RowList, RowSkeleton, StatCard, StatSkeleton } from "@/components/molecules";
import { PageLayout } from "@/components/templates";
import { api, type Txn, useAct, useTransactions } from "@/lib/api";
import { shortDateTime } from "@/lib/dates";
import { inr, rupeesToPaise } from "@/lib/money";
import { vendorLabel } from "@/lib/txn";

const left = (t: Txn) => (t.owed_paise ?? 0) - (t.repaid_paise ?? 0);

/** One payment someone owes back: settle it in full, or record part of it coming back. */
function Row({ t }: { t: Txn }) {
  const act = useAct();
  const [part, setPart] = useState("");
  const add = rupeesToPaise(part);
  const setRepaid = (paise: number, ok: string) => act(() => api(`/transactions/${t.id}`, { method: "PATCH", body: { repaid_paise: paise } }), { ok, onDone: () => setPart("") });
  const valid = add !== null && add > 0 && add <= left(t);

  return (
    <ListRow title={vendorLabel(t)}
      subtitle={`${shortDateTime(t.received_at ?? t.occurred_at)} · paid ${inr(t.amount_paise)}, they owe ${inr(t.owed_paise ?? 0)}${t.repaid_paise ? ` · back ${inr(t.repaid_paise)}` : ""}`}
      trailing={left(t) === 0 ? <Badge variant="good">Settled</Badge> : (
        <span className="flex items-center gap-2">
          <span className="text-warn">{inr(left(t))}</span>
          <Input type="number" min={0} step="any" size="sm" className="w-24" aria-label="Amount received" placeholder="Got ₹" value={part} onChange={(e) => setPart(e.target.value)} />
          <Button size="sm" variant="ghost" disabled={!valid} onClick={() => setRepaid((t.repaid_paise ?? 0) + add!, "Repayment recorded")}>Add</Button>
          <Button size="sm" variant="ghost" icon={Check} onClick={() => setRepaid(t.owed_paise ?? 0, "Marked settled")}>Settled</Button>
        </span>
      )} />
  );
}

export default function Owed() {
  const q = useTransactions({ owed: true }, 1000);
  const rows = q.data ?? [];
  const people = new Map<string, Txn[]>();
  for (const t of rows) {
    const k = (t.owed_from ?? "").trim().toLowerCase();
    people.set(k, [...(people.get(k) ?? []), t]);
  }
  const groups = [...people.values()].map((ts) => ({ name: ts[0].owed_from ?? "", ts, left: ts.reduce((a, t) => a + left(t), 0) })).sort((a, b) => b.left - a.left);
  const total = groups.reduce((a, g) => a + g.left, 0);

  return (
    <PageLayout title="Owed to Me" icon={HandCoins} error={q.error} description="Payments you made for others. The part they owe back is not counted as your spending">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        {q.isLoading ? [0, 1].map((i) => <StatSkeleton key={i} />) : <>
          <StatCard label="Still to come back" value={inr(total)} tone={total > 0 ? "warn" : "good"} />
          <StatCard label="People" value={String(groups.filter((g) => g.left > 0).length)} sub={`${rows.length} payment${rows.length === 1 ? "" : "s"} tracked`} />
        </>}
      </div>

      <div className="mt-4 space-y-4">
        {q.isLoading ? <RowSkeleton /> : groups.length === 0 ? (
          <div className="border border-line"><EmptyState icon={HandCoins}>Paid for a friend? On the Transactions page, click the coin icon on that payment to track what they owe you.</EmptyState></div>
        ) : groups.map((g) => (
          <Card key={g.name.toLowerCase()} title={g.name} icon={HandCoins} action={<span className={g.left > 0 ? "num text-[13px] font-semibold text-warn" : "text-[12px] text-gain"}>{g.left > 0 ? `${inr(g.left)} to come` : "All settled"}</span>}>
            <RowList>{g.ts.map((t) => <Row key={t.id} t={t} />)}</RowList>
          </Card>
        ))}
      </div>
    </PageLayout>
  );
}
