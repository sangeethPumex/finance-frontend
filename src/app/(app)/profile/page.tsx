"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserCircle, X } from "@phosphor-icons/react";
import { Button, Input } from "@/components/atoms";
import { Card, FormField } from "@/components/molecules";
import { PageLayout } from "@/components/templates";
import { useFunds } from "@/lib/api";
import { type Holding, type Profile, useForget, useProfile } from "@/lib/profile";

type Num = "salary" | "salaryDay" | "sip" | "fixedMonthly" | "bufferTarget";
const NUMS: { key: Num; label: string; hint: string }[] = [
  { key: "salary", label: "Monthly salary (₹)", hint: "Take-home" },
  { key: "salaryDay", label: "Salary day of month", hint: "1 to 31" },
  { key: "sip", label: "Monthly SIPs (₹)", hint: "Taken from your funds once you add any" },
  { key: "fixedMonthly", label: "Fixed commitments (₹)", hint: "Rent, bills. EMIs go on the EMIs page" },
  { key: "bufferTarget", label: "Savings buffer target (₹)", hint: "Cash you never want to dip below" },
];
const BUCKETS: { key: "mf" | "other"; label: string }[] = [
  { key: "mf", label: "Mutual funds" }, { key: "other", label: "Other investments" },
];

const n = (v: string) => Math.max(Number(v) || 0, 0);

export default function AboutMe() {
  const { profile, save, saving, ready, error } = useProfile();
  const [draft, setDraft] = useState<Profile>(profile);
  const forget = useForget();
  const funds = useFunds().data?.summary, hasFunds = (funds?.count ?? 0) > 0;
  useEffect(() => setDraft(profile), [profile]);

  const edit = (p: Profile) => setDraft(p);
  const setHolding = (k: "mf" | "other", f: keyof Holding, v: string) => edit({ ...draft, [k]: { ...draft[k], [f]: n(v) } });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    save({ ...draft, salaryDay: Math.min(Math.max(Math.round(draft.salaryDay) || 1, 1), 31) });
  }

  return (
    <PageLayout title="About Me" icon={UserCircle} error={error} description="What Catalyst knows about you. It drives runway, your daily target and, later, the AI's advice.">
      <form className="grid gap-4 xl:grid-cols-2" onSubmit={submit}>
        <Card title="Income and commitments">
          <div className="grid gap-4 sm:grid-cols-2">
            {NUMS.map((f) => (
              <FormField key={f.key} label={f.label} hint={f.hint}>
                <Input type="number" min={0} step="any" inputMode="decimal" disabled={!ready || (f.key === "sip" && hasFunds)} value={(f.key === "sip" && hasFunds ? funds?.sipMonthly : draft[f.key]) || ""} onChange={(e) => edit({ ...draft, [f.key]: n(e.target.value) })} />
              </FormField>
            ))}
          </div>
        </Card>
        <Card title="Investments">
          <div className="space-y-4">
            {BUCKETS.map((b) => b.key === "mf" && hasFunds ? (
              <p key={b.key} className="text-[13px] text-muted">Mutual funds are tracked on the <Link href="/funds" className="text-ink underline">Mutual Funds</Link> page.</p>
            ) : (
              <div key={b.key} className="grid grid-cols-[110px_1fr_1fr] items-end gap-3">
                <span className="pb-2 text-[13px] text-sub">{b.label}</span>
                {(["invested", "current"] as const).map((f) => (
                  <FormField key={f} label={f === "invested" ? "Invested (₹)" : "Current value (₹)"}>
                    <Input type="number" min={0} step="any" inputMode="decimal" disabled={!ready} value={draft[b.key][f] || ""} onChange={(e) => setHolding(b.key, f, e.target.value)} />
                  </FormField>
                ))}
              </div>
            ))}
          </div>
        </Card>
        <Card title="Before Catalyst, this month" className="xl:col-span-2">
          <p className="mb-4 text-[13px] text-muted">Started tracking mid-month? Enter what you spent and earned earlier this month so the dashboard, savings rate and runway are not understated. It applies to this month only.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["spent", "income"] as const).map((f) => (
              <FormField key={f} label={f === "spent" ? "Spent before tracking (₹)" : "Income before tracking (₹)"}>
                <Input type="number" min={0} step="any" inputMode="decimal" disabled={!ready} value={draft.prior[f] || ""} onChange={(e) => edit({ ...draft, prior: { ...draft.prior, [f]: n(e.target.value) } })} />
              </FormField>
            ))}
          </div>
        </Card>
        <Card title="Goals and notes" className="xl:col-span-2">
          <FormField hint="Anything the AI should know: goals, dependants, upcoming big expenses.">
            <textarea rows={4} value={draft.goals} onChange={(e) => edit({ ...draft, goals: e.target.value })} className="w-full border border-line p-3 text-[13px]" />
          </FormField>
        </Card>
        <Card title="What the AI remembers" className="xl:col-span-2">
          {profile.memory.length === 0 ? (
            <p className="text-[13px] text-muted">Nothing yet. When you tell the AI Expert a lasting goal or preference, it is kept here and used in later answers.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {profile.memory.map((f) => (
                <li key={f} className="flex items-center gap-1.5 rounded-full border border-line py-1 pl-3 pr-1.5 text-[13px] text-sub">
                  {f}
                  <button type="button" aria-label={`Forget: ${f}`} className="grid size-5 place-content-center rounded-full text-muted hover:bg-tint hover:text-loss" onClick={() => forget(f)}><X size={12} /></button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="flex items-center gap-3 xl:col-span-2">
          <Button type="submit" loading={saving} disabled={!ready}>Save</Button>
        </div>
      </form>
    </PageLayout>
  );
}
