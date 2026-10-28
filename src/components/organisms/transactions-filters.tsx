"use client";

import { useEffect, useState } from "react";
import { BookmarkSimple, MagnifyingGlass, X } from "@phosphor-icons/react";
import type { Account, Category, TxnFilter } from "@/lib/api";
import { Button, Input, Select } from "../atoms";
import { Tag } from "../molecules";

const KEY = "catalyst.txn-views";
type SavedView = { name: string; filter: TxnFilter };

// ponytail: saved views live in this browser only; move them to the backend if they need to follow the user across devices.
const load = (): SavedView[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };
const store = (v: SavedView[]) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage blocked */ } };

/** Search box, filters and saved views. The parent owns the filter and fetches; this only edits it. */
export function TransactionsFilters({ value, onChange, accounts, categories }: { value: TxnFilter; onChange: (f: TxnFilter) => void; accounts: Account[]; categories: Category[] }) {
  const [views, setViews] = useState<SavedView[]>([]);
  const [text, setText] = useState(value.q ?? "");
  useEffect(() => setViews(load()), []); // after mount so server and client render the same first frame
  useEffect(() => setText(value.q ?? ""), [value.q]); // a saved view replaces the typed text
  useEffect(() => { // search as you type, after a short pause
    if (text === (value.q ?? "")) return;
    const t = setTimeout(() => onChange({ ...value, q: text }), 300);
    return () => clearTimeout(t);
  }, [text, value, onChange]);

  const set = (k: keyof TxnFilter) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...value, [k]: e.target.value });
  const active = Object.values(value).some(Boolean);
  const save = () => {
    const name = window.prompt("Name this view")?.trim();
    if (!name) return;
    const next = [...views.filter((v) => v.name !== name), { name, filter: value }];
    setViews(next); store(next);
  };
  const remove = (name: string) => { const next = views.filter((v) => v.name !== name); setViews(next); store(next); };

  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <MagnifyingGlass size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input aria-label="Search" className="w-full pl-8" placeholder="Search vendor or UPI id" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <Select aria-label="Category" value={value.category_id ?? ""} onChange={set("category_id")}><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Select aria-label="Account" value={value.account_id ?? ""} onChange={set("account_id")}><option value="">All accounts</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
        <Select aria-label="Direction" value={value.direction ?? ""} onChange={set("direction")}><option value="">In and out</option><option value="debit">Money out</option><option value="credit">Money in</option></Select>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
        <Input type="date" size="sm" aria-label="From date" value={value.from ?? ""} onChange={set("from")} />–<Input type="date" size="sm" aria-label="To date" value={value.to ?? ""} onChange={set("to")} />
        <Input type="number" min={0} size="sm" aria-label="Minimum amount" className="w-24" placeholder="Min ₹" value={value.min ?? ""} onChange={set("min")} />
        <Input type="number" min={0} size="sm" aria-label="Maximum amount" className="w-24" placeholder="Max ₹" value={value.max ?? ""} onChange={set("max")} />
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!value.owed} onChange={(e) => onChange({ ...value, owed: e.target.checked || undefined })} />Owed to me</label>
        {active && <Button size="sm" variant="quiet" icon={X} onClick={() => onChange({})}>Clear</Button>}
        {active && <Button size="sm" variant="ghost" icon={BookmarkSimple} onClick={save}>Save view</Button>}
      </div>
      {views.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wide text-faint">Saved</span>
          {views.map((v) => (
            <Tag key={v.name} variant="outline" onRemove={() => remove(v.name)} removeLabel={`Delete view ${v.name}`}>
              <button type="button" onClick={() => onChange(v.filter)}>{v.name}</button>
            </Tag>
          ))}
        </div>
      )}
    </div>
  );
}
