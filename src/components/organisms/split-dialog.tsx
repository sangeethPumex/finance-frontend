"use client";

import { useState } from "react";
import { Plus, SplitHorizontal, Trash } from "@phosphor-icons/react";
import { api, useAct, useCategories, type Txn } from "@/lib/api";
import { inr, rupeesToPaise } from "@/lib/money";
import { vendorLabel } from "@/lib/txn";
import { Button, Input, Select } from "../atoms";
import { Modal } from "../molecules";

type Row = { category_id: string; amount: string };

/** Splits one payment across categories (Amazon: groceries plus a gift). The parts must add up to the whole payment; the backend checks it again. */
export function SplitDialog({ txn, onClose }: { txn: Txn; onClose: () => void }) {
  const act = useAct();
  const cats = useCategories().data ?? [];
  const [rows, setRows] = useState<Row[]>(txn.splits?.length
    ? txn.splits.map((s) => ({ category_id: s.category_id, amount: String(s.paise / 100) }))
    : [{ category_id: txn.category_id ?? "", amount: "" }, { category_id: "", amount: "" }]);
  const paise = rows.map((r) => rupeesToPaise(r.amount));
  const sum = paise.reduce<number>((a, p) => a + (p ?? 0), 0);
  const left = txn.amount_paise - sum;
  const ok = rows.length >= 2 && left === 0 && rows.every((r, i) => r.category_id && paise[i] !== null && paise[i]! > 0);
  const set = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const save = (splits: { category_id: string; paise: number }[], ok: string) => act(() => api(`/transactions/${txn.id}`, { method: "PATCH", body: { splits } }), { ok, onDone: onClose });

  return (
    <Modal title="Split across categories" subtitle={`${vendorLabel(txn)} · ${inr(txn.amount_paise)}`} icon={SplitHorizontal} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); if (ok) save(rows.map((r, i) => ({ category_id: r.category_id, paise: paise[i]! })), "Split saved"); }} className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <Select aria-label={`Category ${i + 1}`} className="min-w-0 flex-1" value={r.category_id} onChange={(e) => set(i, { category_id: e.target.value })}>
              <option value="">Category…</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input type="number" min={0} step="any" aria-label={`Amount ${i + 1}`} className="w-28" placeholder="₹" value={r.amount} onChange={(e) => set(i, { amount: e.target.value })} />
            <Button variant="quiet" size="icon" icon={Trash} aria-label="Remove part" disabled={rows.length <= 2} onClick={() => setRows(rows.filter((_, j) => j !== i))} />
          </div>
        ))}
        <div className="flex items-center justify-between text-[12px]">
          <Button variant="ghost" size="sm" icon={Plus} disabled={rows.length >= 10} onClick={() => setRows([...rows, { category_id: "", amount: "" }])}>Add part</Button>
          <span className={left === 0 ? "text-gain" : "text-warn"}>{left === 0 ? "Adds up" : left > 0 ? `${inr(left)} left to assign` : `${inr(-left)} over`}</span>
        </div>
        <div className="flex gap-2 border-t border-line pt-4">
          <Button type="submit" disabled={!ok}>Save split</Button>
          {txn.splits?.length ? <Button variant="ghost" onClick={() => save([], "Split removed")}>Remove split</Button> : null}
        </div>
      </form>
    </Modal>
  );
}
