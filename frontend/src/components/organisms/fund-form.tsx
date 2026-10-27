"use client";

import { useState } from "react";
import { type FundInput, type FundLookup, type FundType, type FundView, type Membership, type SipStatus, lookupFund, useAccounts } from "@/lib/api";
import { inr } from "@/lib/money";
import { Button, Input, Select } from "../atoms";
import { FormField, InlineError, Modal } from "../molecules";

export const FUND_TYPES: FundType[] = ["Equity", "Debt", "Metal", "Foreign"];
export const MEMBERSHIPS: Membership[] = ["Genius", "Standalone"];

type Draft = { platform: string; accountId: string; sipStatus: SipStatus; type: FundType; membership: Membership; units: string; avgNav: string; invested: string; sipAmount: string; sipDay: string };
const SIP_STATUSES: { value: SipStatus; label: string }[] = [{ value: "active", label: "Active" }, { value: "paused", label: "Paused" }, { value: "cancelled", label: "Cancelled" }];
const s = (n?: number) => (n === undefined ? "" : String(n));

/** Add or edit a tracked fund: look the scheme up by code, then enter your holding. The backend re-checks the code and stores the NAV. */
export function FundForm({ initial, onSave, onClose }: { initial?: FundView; onSave: (f: FundInput) => void; onClose: () => void }) {
  const [code, setCode] = useState(s(initial?.code));
  const [found, setFound] = useState<FundLookup | null>(initial ? { code: initial.code, name: initial.name, fundHouse: initial.fundHouse ?? "", category: "", nav: initial.nav ?? 0, date: initial.navDate ?? "" } : null);
  const accounts = useAccounts().data ?? [];
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [d, setD] = useState<Draft>({
    platform: initial?.platform ?? "", accountId: initial?.accountId ?? "", sipStatus: initial?.sip?.status ?? "active", type: initial?.type ?? "Equity", membership: initial?.membership ?? "Standalone",
    units: s(initial?.units), avgNav: s(initial?.avgNav), invested: s(initial?.invested), sipAmount: s(initial?.sip?.amount), sipDay: s(initial?.sip?.day),
  });
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });

  async function find(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try { setFound(await lookupFund(code)); } catch (x) { setFound(null); setErr(x instanceof Error ? x.message : "Lookup failed"); }
    setBusy(false);
  }

  const units = Number(d.units), avgNav = Number(d.avgNav), invested = d.invested.trim() === "" ? undefined : Number(d.invested);
  const sipAmount = Number(d.sipAmount) || 0, sipDay = Math.round(Number(d.sipDay));
  const ok = !!found && units > 0 && avgNav > 0 && (invested === undefined || invested >= 0) && d.platform.trim() !== "" && (d.accountId !== "" || accounts.length === 0) && (sipAmount === 0 || (sipDay >= 1 && sipDay <= 31));
  const hint = units > 0 && avgNav > 0 ? `Left empty, uses units × avg NAV = ${inr(Math.round(units * avgNav * 100))}` : undefined;

  return (
    <Modal title={initial ? "Edit fund" : "Add fund"} onClose={onClose}>
      <form onSubmit={find} className="flex items-end gap-2">
        <FormField label="Scheme code" className="flex-1"><Input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="140084" disabled={!!initial} autoFocus={!initial} /></FormField>
        {!initial && <Button type="submit" variant="ghost" loading={busy} disabled={!code.trim()}>Look up</Button>}
      </form>
      <InlineError error={err} />
      {found && (
        <form onSubmit={(e) => { e.preventDefault(); if (ok) onSave({ code: found.code, platform: d.platform.trim(), accountId: d.accountId || undefined, type: d.type, membership: d.membership, units, avgNav, invested, sip: sipAmount > 0 ? { amount: sipAmount, day: sipDay, status: d.sipStatus } : undefined }); }} className="mt-4 space-y-4">
          <div className="border border-line bg-tint p-3 text-[13px]">
            <div className="font-medium">{found.name}</div>
            <div className="text-[12px] text-muted">{found.fundHouse}{found.nav > 0 && ` · NAV ₹${found.nav} (${found.date})`}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Units"><Input type="number" min={0} step="any" value={d.units} onChange={set("units")} /></FormField>
            <FormField label="Avg NAV (₹)"><Input type="number" min={0} step="any" value={d.avgNav} onChange={set("avgNav")} /></FormField>
            <FormField label="Currently invested (₹)" hint={hint} className="col-span-2"><Input type="number" min={0} step="any" value={d.invested} onChange={set("invested")} /></FormField>
            <FormField label="Platform"><Input value={d.platform} onChange={set("platform")} placeholder="Groww, Zerodha…" /></FormField>
            <FormField label="Bank account (SIP debits from)" className="col-span-2">
              <Select value={d.accountId} onChange={set("accountId")}>
                <option value="">{accounts.length ? "Select a bank…" : "No bank accounts yet"}</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.bank} · {a.name}{a.last4 && ` ••${a.last4}`}</option>)}
              </Select>
            </FormField>
            <FormField label="Fund type"><Select value={d.type} onChange={set("type")}>{FUND_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></FormField>
            <FormField label="Membership" className="col-span-2"><Select value={d.membership} onChange={set("membership")}>{MEMBERSHIPS.map((t) => <option key={t}>{t}</option>)}</Select></FormField>
          </div>
          <details className="border border-line p-4" open={!!initial?.sip}>
            <summary className="cursor-pointer text-[13px] text-sub">SIP (optional)</summary>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <FormField label="Monthly amount (₹)"><Input type="number" min={0} step="any" value={d.sipAmount} onChange={set("sipAmount")} /></FormField>
              <FormField label="Day of month (1-31)"><Input type="number" min={1} max={31} value={d.sipDay} onChange={set("sipDay")} /></FormField>
              <FormField label="Status" className="col-span-2"><Select value={d.sipStatus} onChange={set("sipStatus")}>{SIP_STATUSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></FormField>
            </div>
          </details>
          <Button type="submit" disabled={!ok}>{initial ? "Save changes" : "Add fund"}</Button>
        </form>
      )}
    </Modal>
  );
}
