"use client";

import { useState } from "react";
import { Percent, X } from "@phosphor-icons/react";
import { api, type EmiView, useAct } from "@/lib/api";
import { Button, Input } from "../atoms";
import { FormField, Modal } from "../molecules";

const when = (s: string) => (s ? new Date(`${s}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit", timeZone: "UTC" }) : "Start");
const today = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

function ChangeRate({ emi, onClose }: { emi: EmiView; onClose: () => void }) {
  const act = useAct();
  const [v, setV] = useState({ from: today(), rate: "" });
  const rate = Number(v.rate), ok = !!v.from && rate > 0 && rate <= 100;
  return (
    <Modal title="Interest rate change" subtitle={emi.name} icon={Percent} onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (ok) act(() => api(`/emis/${emi.id}/rates`, { method: "POST", body: { from: v.from, rate } }), { ok: "Rate updated", onDone: onClose }); }}>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Effective from"><Input type="date" value={v.from} onChange={(e) => setV({ ...v, from: e.target.value })} /></FormField>
          <FormField label="New rate (% a year)"><Input type="number" min={0} step="any" value={v.rate} onChange={(e) => setV({ ...v, rate: e.target.value })} placeholder={String(emi.rate ?? "")} autoFocus /></FormField>
        </div>
        <Button type="submit" disabled={!ok}>Save</Button>
      </form>
    </Modal>
  );
}

/** The rate over time as a small timeline, with a button to add a reset. */
export function RateHistory({ emi }: { emi: EmiView }) {
  const act = useAct();
  const [open, setOpen] = useState(false);
  const steps = emi.rates?.length ? emi.rates : [{ from: "", rate: emi.rate ?? 0 }];
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-[12px] font-medium text-muted">Interest rate{emi.rateType && ` · ${emi.rateType}`}</h4>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>Change rate</Button>
      </div>
      <ol className="flex flex-wrap items-start gap-y-3">
        {steps.map((s, i) => (
          <li key={s.from} className="group relative flex min-w-[96px] flex-1 flex-col">
            <div className="flex items-center"><span className="size-2.5 rounded-full bg-ink" />{i < steps.length - 1 && <span className="h-px flex-1 bg-strong" />}</div>
            <span className="num mt-1.5 text-[15px] font-medium">{s.rate}%</span>
            <span className="text-[11px] text-muted">{when(s.from)}</span>
            {s.from && (
              <button type="button" aria-label={`Remove change on ${when(s.from)}`} onClick={() => act(() => api(`/emis/${emi.id}/rates/${s.from}`, { method: "DELETE" }), { ok: "Rate change removed" })}
                className="absolute right-2 top-4 hidden text-muted hover:text-loss group-hover:block"><X size={12} /></button>
            )}
          </li>
        ))}
      </ol>
      {open && <ChangeRate emi={emi} onClose={() => setOpen(false)} />}
    </div>
  );
}
