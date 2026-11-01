"use client";

import { useState } from "react";
import { Bell, CalendarCheck, ListChecks, Note, Plus, ShoppingCart, Tag, X } from "@phosphor-icons/react";
import type { JoggerInput, JoggerKind, JoggerList } from "@/lib/api";
import { cn } from "@/lib/cn";
import { rupeesToPaise } from "@/lib/money";
import { Button, Input } from "../atoms";
import { FormField, Modal } from "../molecules";

export const LEAD_CHOICES = [
  { mins: 120, label: "2 hr" }, { mins: 60, label: "1 hr" }, { mins: 30, label: "30 min" }, { mins: 15, label: "15 min" }, { mins: 5, label: "5 min" }, { mins: 0, label: "On time" },
];

const KINDS: { value: JoggerKind; label: string; icon: typeof ShoppingCart }[] = [{ value: "shopping", label: "Shopping", icon: ShoppingCart }, { value: "reminder", label: "Reminder", icon: Bell }];

/** An ISO timestamp as the "YYYY-MM-DDTHH:mm" a datetime-local input wants, in the device's own time zone. */
const toLocal = (iso: string) => {
  const d = new Date(iso), p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

type Row = { key: number; id?: string; name: string; amount: string; bought: boolean };

/** Add or edit a shopping list or reminder: what, when, which alerts, and (for shopping) the items with an expected price. */
export function JoggerForm({ initial, onSave, onClose }: { initial?: JoggerList; onSave: (v: JoggerInput) => void; onClose: () => void }) {
  const [kind, setKind] = useState<JoggerKind>(initial?.kind ?? "shopping");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [at, setAt] = useState(initial ? toLocal(initial.remind_at) : "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [leads, setLeads] = useState<number[]>(initial?.lead_mins ?? [30, 15]);
  const [seq, setSeq] = useState(initial?.items.length ?? 1);
  const [rows, setRows] = useState<Row[]>(initial?.items.length ? initial.items.map((it, key) => ({ key, id: it.id, name: it.name, amount: it.est_paise ? String(it.est_paise / 100) : "", bought: it.bought })) : [{ key: 0, name: "", amount: "", bought: false }]);

  const patch = (key: number, p: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...p } : x)));
  const addRow = () => { setRows((r) => [...r, { key: seq, name: "", amount: "", bought: false }]); setSeq(seq + 1); };
  const toggleLead = (m: number) => setLeads((l) => (l.includes(m) ? l.filter((x) => x !== m) : [...l, m]));

  const filled = rows.filter((r) => r.name.trim() !== "");
  const badAmount = filled.some((r) => r.amount.trim() !== "" && (rupeesToPaise(r.amount) ?? -1) < 0);
  const total = filled.reduce((a, r) => a + Math.max(rupeesToPaise(r.amount || "0") ?? 0, 0), 0);
  const ok = title.trim() !== "" && at !== "" && !isNaN(new Date(at).getTime()) && leads.length <= 5 && !badAmount && (kind === "reminder" || filled.length > 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok) return;
    onSave({
      title: title.trim(), kind, note: kind === "reminder" ? note.trim() : "", remind_at: new Date(at).toISOString(), lead_mins: leads,
      items: kind === "shopping" ? filled.map((r) => ({ id: r.id, name: r.name.trim(), est_paise: rupeesToPaise(r.amount || "0") ?? 0, bought: r.bought })) : [],
    });
  };

  return (
    <Modal title={initial ? "Edit" : "New list or reminder"} subtitle="Get a push notification before it is due" icon={ListChecks} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {KINDS.map((k) => (
            <button key={k.value} type="button" onClick={() => setKind(k.value)} className={cn("flex h-11 items-center justify-center gap-2 rounded-md border text-[13px] font-medium transition-colors md:h-9", kind === k.value ? "border-ink bg-ink text-white" : "border-strong text-muted hover:bg-tint")}>
              <k.icon size={15} />{k.label}
            </button>
          ))}
        </div>
        <FormField label={kind === "shopping" ? "Where / what for" : "Remind me to"} icon={Tag}><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "shopping" ? "Forum Mall" : "Call the bank"} autoFocus /></FormField>
        <FormField label="When" icon={CalendarCheck}><Input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} /></FormField>

        <div>
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-sub"><Bell size={14} className="text-muted" />Alert me</span>
          <div className="flex flex-wrap gap-2">
            {LEAD_CHOICES.map((c) => (
              <button key={c.mins} type="button" aria-pressed={leads.includes(c.mins)} onClick={() => toggleLead(c.mins)} className={cn("h-9 rounded-full border px-3 text-xs font-medium transition-colors", leads.includes(c.mins) ? "border-ink bg-ink text-white" : "border-strong text-muted hover:bg-tint")}>{c.label}</button>
            ))}
          </div>
          <span className="mt-1.5 block text-xs text-muted">Before the time above; pick as many as you like</span>
        </div>

        {kind === "reminder" ? (
          <FormField label="Note" icon={Note} hint="Optional"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ask about the card limit" /></FormField>
        ) : (
          <div>
            <div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Items</span><span className="num text-xs text-muted">{total > 0 && `Expected ₹${(total / 100).toLocaleString("en-IN")}`}</span></div>
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.key} className="flex items-center gap-2">
                  <Input value={r.name} onChange={(e) => patch(r.key, { name: e.target.value })} placeholder="Item" className="min-w-0 flex-1" />
                  <Input type="number" inputMode="decimal" min={0} step="any" value={r.amount} onChange={(e) => patch(r.key, { amount: e.target.value })} placeholder="₹" className="w-24 shrink-0" />
                  <Button size="icon" variant="quiet" icon={X} aria-label="Remove item" disabled={rows.length === 1} onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))} />
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" icon={Plus} className="mt-2" onClick={addRow}>Add item</Button>
          </div>
        )}

        <div className="border-t border-line pt-4"><Button type="submit" disabled={!ok}>{initial ? "Save changes" : "Save"}</Button></div>
      </form>
    </Modal>
  );
}
