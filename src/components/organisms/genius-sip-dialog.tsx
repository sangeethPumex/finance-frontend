"use client";

import { useState } from "react";
import { Bank, CalendarBlank, CurrencyInr, Repeat } from "@phosphor-icons/react";
import { useAccounts, type GeniusSip } from "@/lib/api";
import { bankName } from "@/lib/banks";
import { cn } from "@/lib/cn";
import { Button, Input, Select } from "../atoms";
import { FormField, Modal } from "../molecules";

/** The one monthly SIP for the whole Genius basket. It stays the same however many funds ET Money holds in it. */
export function GeniusSipDialog({ initial, onSave, onClose, pending }: { initial?: GeniusSip; onSave: (s: GeniusSip) => void; onClose: () => void; pending?: boolean }) {
  const accounts = useAccounts().data ?? [];
  const [d, setD] = useState({ amount: initial ? String(initial.amount) : "", day: initial ? String(initial.day) : "", accountId: initial?.accountId ?? "" });
  const amount = Number(d.amount), day = Math.round(Number(d.day));
  const ok = amount > 0 && day >= 1 && day <= 31;
  return (
    <Modal title="Genius SIP" subtitle="One SIP for the whole basket" icon={Repeat} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); if (ok) onSave({ amount, day, status: initial?.status ?? "active", accountId: d.accountId || undefined }); }} className="space-y-4">
        <p className="bg-tint p-3 text-[12px] text-sub">ET Money splits this one amount across the funds in your Genius basket. It stays the same whether the basket holds 2 funds or 6, so set it once here instead of on each fund.</p>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Monthly amount (₹)" icon={CurrencyInr}><Input type="number" min={0} step="any" value={d.amount} onChange={(e) => setD({ ...d, amount: e.target.value })} placeholder="4000" autoFocus /></FormField>
          <FormField label="Day of month (1-31)" icon={CalendarBlank}><Input type="number" min={1} max={31} value={d.day} onChange={(e) => setD({ ...d, day: e.target.value })} placeholder="5" /></FormField>
          <FormField label="Bank account (debits from)" icon={Bank} className="col-span-2">
            <Select value={d.accountId} onChange={(e) => setD({ ...d, accountId: e.target.value })}>
              <option value="">Not set</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{bankName(a.bank)} · {a.name}</option>)}
            </Select>
          </FormField>
        </div>
        <div className="flex gap-2 border-t border-line pt-4">
          <Button type="submit" loading={pending} disabled={!ok} className={cn(!ok && "opacity-50")}>{initial ? "Save SIP" : "Set SIP"}</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
