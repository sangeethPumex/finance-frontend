"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck } from "@phosphor-icons/react";
import { api, type Txn } from "@/lib/api";
import { inr } from "@/lib/money";
import { Skeleton, Modal, ListRow, RowList } from "../molecules";
import { SearchBox } from "./search-box";

/** Pick the bank debit that paid a mandate's due date, for when it was not detected on its own. Lists debits from 10 days before the date. */
export function MandatePayDialog({ name, due, onPick, onClose }: { name: string; due: string; onPick: (txnId: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const from = new Date(new Date(`${due}T00:00:00Z`).getTime() - 10 * 864e5).toISOString().slice(0, 10);
  const txns = useQuery({ queryKey: ["transactions", "mandate-pay", from, q], queryFn: () => api<Txn[]>(`/transactions?direction=debit&limit=40&from=${from}&q=${encodeURIComponent(q)}`) });
  return (
    <Modal title="Link a payment" subtitle={`${name}, due ${due}. Pick the transaction that paid it.`} icon={CalendarCheck} onClose={onClose}>
      <SearchBox value={q} onChange={setQ} placeholder="Search payee" className="mb-3" />
      {txns.isLoading ? <Skeleton className="h-24" /> : txns.error ? <p className="text-[13px] text-loss">{txns.error.message}</p> : (txns.data ?? []).length === 0 ? <p className="text-[13px] text-muted">No matching payments.</p> : (
        <div className="max-h-80 overflow-y-auto">
          <RowList>
            {txns.data!.map((t) => (
              <button key={t.id} type="button" onClick={() => onPick(t.id)} className="block w-full text-left">
                <ListRow title={t.raw_vendor || t.upi_id || "Unknown"} subtitle={new Date(t.received_at ?? t.occurred_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} trailing={inr(t.amount_paise)} />
              </button>
            ))}
          </RowList>
        </div>
      )}
    </Modal>
  );
}
