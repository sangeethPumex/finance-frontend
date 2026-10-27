"use client";

import { useState } from "react";
import { ArrowsLeftRight, CalendarBlank, CurrencyInr, Plus, SignOut } from "@phosphor-icons/react";
import type { FundView } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Button, Input } from "../atoms";
import { FormField, Modal, SectionTitle } from "../molecules";
import { rs } from "./fund-row";

const today = () => new Date().toISOString().slice(0, 10);

export type Exit = { id: string; date: string; proceeds?: number };

/**
 * Monthly Genius rebalance. ET Money swaps funds in and out of the basket; tick the ones that left and (optionally) what was credited,
 * then add the ones that came in. Funds that leave keep their history and the realised gain instead of being deleted.
 */
export function RebalanceDialog({ funds, preselect = [], onExit, onAddIncoming, onClose, pending }: {
  funds: FundView[]; preselect?: string[]; onExit: (exits: Exit[]) => void; onAddIncoming: () => void; onClose: () => void; pending?: boolean;
}) {
  const [out, setOut] = useState<Record<string, string>>(() => Object.fromEntries(preselect.map((id) => [id, ""])));
  const [date, setDate] = useState(today());
  const picked = Object.keys(out);
  const toggle = (id: string) => setOut((o) => { const n = { ...o }; if (id in n) delete n[id]; else n[id] = ""; return n; });
  const bad = picked.some((id) => out[id].trim() !== "" && !(Number(out[id]) >= 0));
  const ok = picked.length > 0 && !!date && !bad;

  return (
    <Modal title="Monthly rebalance" subtitle="ET Money Genius moves funds in and out each month" icon={ArrowsLeftRight} wide onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); if (ok) onExit(picked.map((id) => ({ id, date, proceeds: out[id].trim() === "" ? undefined : Number(out[id]) }))); }}>
        <SectionTitle icon={SignOut}>Moved out this month</SectionTitle>
        {funds.length === 0 ? <p className="text-[13px] text-muted">No active Genius funds to move out.</p> : (
          <ul className="divide-y divide-line-soft border border-line">
            {funds.map((f) => {
              const on = f.id in out;
              return (
                <li key={f.id} className={cn("px-4 py-3", on && "bg-loss-bg/40")}>
                  <label className="flex cursor-pointer items-center gap-3">
                    <input type="checkbox" checked={on} onChange={() => toggle(f.id)} className="size-4 accent-ink" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold">{f.name}</span><span className="text-[12px] text-muted">Worth {rs(f.value)} · invested {rs(f.invested)}</span></span>
                  </label>
                  {on && (
                    <div className="mt-3 pl-7">
                      <FormField label="Amount credited (₹)" icon={CurrencyInr} hint={`Leave blank to use today's value, ${rs(f.value)}`}>
                        <Input type="number" min={0} step="any" value={out[f.id]} onChange={(e) => setOut({ ...out, [f.id]: e.target.value })} placeholder={String(Math.round(f.value))} />
                      </FormField>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-4 max-w-[220px]"><FormField label="Date they moved out" icon={CalendarBlank}><Input type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} /></FormField></div>

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <Button type="submit" loading={pending} disabled={!ok} className={cn(!ok && "opacity-50")}>Record {picked.length || ""} move{picked.length === 1 ? "" : "s"} out</Button>
          <Button variant="ghost" icon={Plus} onClick={onAddIncoming}>Add an incoming fund</Button>
        </div>
        <p className="mt-3 text-[12px] text-muted">Funds that moved in are added as new Genius holdings with their units and average NAV from the ET Money app.</p>
      </form>
    </Modal>
  );
}
