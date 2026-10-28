"use client";

import { useState } from "react";
import { CalendarDots, CalendarCheck, CurrencyInr, Repeat, Tag } from "@phosphor-icons/react";
import { useAccounts, useCategories, type Frequency, type MandateInput } from "@/lib/api";
import { cn } from "@/lib/cn";
import { rupeesToPaise } from "@/lib/money";
import { Button, Input, Select } from "../atoms";
import { FormField, Modal } from "../molecules";

export const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "monthly", label: "Monthly" }, { value: "quarterly", label: "Quarterly" }, { value: "yearly", label: "Yearly" }, { value: "one-off", label: "One-off" },
];

/** Add or edit a mandate. `initial` may be a full Mandate (edit) or a detected suggestion (add with fields filled in). */
export function MandateForm({ initial, editing, onSave, onClose }: { initial?: Partial<MandateInput>; editing?: boolean; onSave: (m: MandateInput) => void; onClose: () => void }) {
  const accounts = useAccounts().data ?? [], categories = useCategories().data ?? [];
  const [d, setD] = useState({
    name: initial?.name ?? "", amount: initial?.amount_paise ? String(initial.amount_paise / 100) : "", frequency: initial?.frequency ?? "yearly",
    next_due: initial?.next_due ?? "", account_id: initial?.account_id ?? "", category_id: initial?.category_id ?? "",
  });
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });
  const paise = rupeesToPaise(d.amount);
  const ok = d.name.trim() !== "" && paise !== null && paise > 0 && d.next_due !== "";

  return (
    <Modal title={editing ? "Edit mandate" : "Add mandate"} subtitle="A payment you must make: insurance, fees, tax, subscriptions" icon={CalendarDots} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); if (ok) onSave({ name: d.name.trim(), amount_paise: paise!, frequency: d.frequency, next_due: d.next_due, account_id: d.account_id || undefined, category_id: d.category_id || undefined }); }} className="space-y-4">
        <FormField label="Name" icon={Tag}><Input value={d.name} onChange={set("name")} placeholder="Health insurance premium" autoFocus /></FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Amount (₹)" icon={CurrencyInr}><Input type="number" min={0} step="any" value={d.amount} onChange={set("amount")} /></FormField>
          <FormField label="How often" icon={Repeat}>
            <Select value={d.frequency} onChange={set("frequency")}>{FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</Select>
          </FormField>
          <FormField label="Next due date" icon={CalendarCheck} className="col-span-2" hint="Recurring ones roll forward from this date on their own"><Input type="date" value={d.next_due} onChange={set("next_due")} /></FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Paid from" hint="Optional">
            <Select value={d.account_id} onChange={set("account_id")}><option value="">Any account</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
          </FormField>
          <FormField label="Category" hint="Optional">
            <Select value={d.category_id} onChange={set("category_id")}><option value="">None</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          </FormField>
        </div>
        <div className="border-t border-line pt-4"><Button type="submit" disabled={!ok} className={cn(!ok && "opacity-50")}>{editing ? "Save changes" : "Add mandate"}</Button></div>
      </form>
    </Modal>
  );
}
