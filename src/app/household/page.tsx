"use client";

import { Calendar, CalendarDots, Car, HandCoins, SquaresFour, Target, Wallet } from "@phosphor-icons/react";
import { Card, StatCard } from "@/components/molecules";
import { PageLayout } from "@/components/templates";
import { useBudgets, useDebts, useEmis, useHousehold, useMandates, useVehicles } from "@/lib/api";
import { inr } from "@/lib/money";

/** Household overview, built from the same backend data as the personal pages. */
export default function HouseholdDashboard() {
  const hh = useHousehold().data?.people ?? [], mandates = useMandates(), budgets = useBudgets(), emis = useEmis(), debts = useDebts(), vehicles = useVehicles();
  const m = mandates.data, open = (debts.data ?? []).filter((d) => !d.paid_at);
  const atRisk = (budgets.data ?? []).filter((b) => b.level !== "ok").length;

  const cash = hh.reduce((t, p) => t + p.cashPaise, 0), invested = hh.reduce((t, p) => t + p.investmentsPaise, 0);
  const dates = [...new Set(hh.flatMap((p) => p.days.map((d) => d.date)))].sort().reverse();
  const cap = (n: string) => n.charAt(0).toUpperCase() + n.slice(1);
  const dayLabel = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <PageLayout title="Household" icon={SquaresFour} error={mandates.error || budgets.error || emis.error || debts.error || vehicles.error}>
      <div className="space-gradient mb-6 px-6 py-8 text-white">
        <div className="eyebrow text-white/70">Next 30 days</div>
        <div className="num mt-2 text-[32px] font-semibold leading-tight">{m ? inr(m.next30_paise) : "–"}</div>
        <div className="mt-1 text-[13px] text-white/80">due across bills and commitments</div>
      </div>

      <Card title="Cash & investments · everyone" icon={Wallet} className="mb-4">
        <div className="num text-[28px] font-semibold leading-tight">{inr(cash + invested)}</div>
        <div className="mt-1 text-[12px] text-muted">{inr(cash)} in bank accounts · {inr(invested)} invested</div>
        <ul className="mt-4 divide-y divide-line-soft border-t border-line text-[13px]">
          {hh.map((p) => (
            <li key={p.name} className="flex items-center justify-between py-2">
              <span>{cap(p.name)}{p.failed && <span className="ml-2 text-loss">unavailable</span>}</span>
              <span className="num text-muted">{inr(p.cashPaise)} cash · {inr(p.investmentsPaise)} invested · <span className="text-ink">{inr(p.cashPaise + p.investmentsPaise)}</span></span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Bills · 90 days" icon={CalendarDots} href="/household/bills" value={m ? inr(m.next90_paise) : "–"} sub={m ? `${m.items.length} bill${m.items.length === 1 ? "" : "s"} tracked` : undefined} />
        <StatCard label="Budgets at risk" icon={Target} href="/household/budgets" tone={atRisk ? "warn" : "neutral"} value={String(atRisk)} sub="At 80% or more this month" />
        <StatCard label="EMIs" icon={Calendar} href="/household/emis" value={emis.data ? `${inr(emis.data.summary.monthly)} / mo` : "–"} sub={emis.data ? `${emis.data.summary.activeCount} active · ${inr(emis.data.summary.outstanding)} outstanding` : undefined} />
        <StatCard label="Owed to us" icon={HandCoins} href="/household/owed" tone="info" value={inr(open.reduce((s, d) => s + d.amount_paise, 0))} sub={`${open.length} open`} />
      </div>

      <Card title="Spending per day · last 14 days with spending" icon={CalendarDots} className="mt-4">
        {dates.length ? (
          <div className="-mx-4 overflow-x-auto sm:-mx-6">
            <table className="w-full text-[13px]">
              <thead><tr className="eyebrow text-left"><th className="px-4 py-2 font-medium sm:px-6">Day</th>{hh.map((p) => <th key={p.name} className="px-4 py-2 text-right font-medium">{cap(p.name)}</th>)}<th className="px-4 py-2 text-right font-medium sm:px-6">Total</th></tr></thead>
              <tbody className="divide-y divide-line-soft">
                {dates.map((date) => {
                  const cells = hh.map((p) => p.days.find((d) => d.date === date));
                  return (
                    <tr key={date}>
                      <td className="whitespace-nowrap px-4 py-2 sm:px-6">{dayLabel(date)}</td>
                      {cells.map((c, i) => (
                        <td key={hh[i].name} className="num px-4 py-2 text-right">{c ? inr(c.paise) : <span className="text-faint">–</span>}{c?.top && <div className="text-[11px] text-muted">{c.top.vendor} {inr(c.top.paise)}</div>}</td>
                      ))}
                      <td className="num px-4 py-2 text-right font-medium sm:px-6">{inr(cells.reduce((t, c) => t + (c?.paise ?? 0), 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="text-[13px] text-muted">No spending recorded yet.</p>}
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card title="Coming up" icon={CalendarDots}>
          {m?.calendar.length ? (
            <ul className="-my-2 divide-y divide-line-soft text-[13px]">
              {m.calendar.slice(0, 6).map((o, i) => (
                <li key={`${o.id}${i}`} className="flex items-center justify-between py-2"><span>{o.name}<span className="ml-2 text-muted">in {o.days}d</span></span><span className="num">{inr(o.paise)}</span></li>
              ))}
            </ul>
          ) : <p className="text-[13px] text-muted">No bills coming up. Add them on the Bills page.</p>}
        </Card>
        <Card title="Garage" icon={Car}>
          <p className="text-[13px] text-muted">{vehicles.data?.length ? `${vehicles.data.length} vehicle${vehicles.data.length === 1 ? "" : "s"} tracked.` : "No vehicles yet."} Fuel, service and papers live on the Vehicles page.</p>
        </Card>
      </div>
    </PageLayout>
  );
}
