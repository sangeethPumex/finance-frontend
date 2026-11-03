"use client";

import { ChartLineUp, Repeat, Storefront, TrendUp, Warning } from "@phosphor-icons/react";
import type { Anomaly, Mover, Pace, Patterns, Recurring, TopVendor } from "@/lib/api";
import { shortDate } from "@/lib/dates";
import { inr } from "@/lib/money";
import { Badge } from "../atoms";
import { BarRow, Card, EmptyState, ListRow, RowList } from "../molecules";

const CADENCE = { weekly: "Weekly", monthly: "Monthly", quarterly: "Every 3 months", yearly: "Yearly" } as const;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const when = (days: number) => (days === 0 ? "due today" : days > 0 ? `next in ${days} day${days === 1 ? "" : "s"}` : `${-days} day${days === -1 ? "" : "s"} late`);

export function AnomalyList({ items }: { items: Anomaly[] }) {
  return (
    <Card title="Unusual payments" icon={Warning} action={items.length > 0 ? <Badge variant="warn">{items.length} to check</Badge> : undefined}>
      {items.length === 0 ? <EmptyState icon={Warning}>Nothing odd in the last two weeks</EmptyState> : (
        <RowList>
          {items.map((a) => (
            <ListRow key={a.txn_id} title={a.vendor}
              subtitle={a.kind === "spike"
                ? `${a.ratio.toFixed(1)}x what this vendor usually costs (${inr(a.usual_paise)}) · ${shortDate(a.at)}`
                : `Unknown payee, ${a.ratio.toFixed(1)}x a typical payment (${inr(a.usual_paise)}) · ${shortDate(a.at)}`}
              trailing={<span className="text-loss">{inr(a.paise)}</span>} />
          ))}
        </RowList>
      )}
    </Card>
  );
}

export function RecurringList({ items, monthlyPaise, tracked }: { items: Recurring[]; monthlyPaise: number; tracked?: (name: string) => boolean }) {
  return (
    <Card title="Recurring charges" icon={Repeat} action={monthlyPaise > 0 ? <span className="num text-[13px] font-semibold">{inr(monthlyPaise)} / month</span> : undefined}>
      {items.length === 0 ? <EmptyState icon={Repeat}>No repeating charges found yet. They show up after three similar payments</EmptyState> : (
        <RowList>
          {items.map((r) => (
            <ListRow key={`${r.name}-${r.cadence}`} title={r.name}
              subtitle={`${CADENCE[r.cadence]} · ${r.count} payments · last ${shortDate(r.last_at)}${r.status === "active" ? ` · ${when(r.days_until)}` : ""}`}
              trailing={r.status === "lapsed" ? <Badge variant="neutral">Stopped?</Badge> : (
                <span className="flex items-center gap-2">
                  {tracked && (tracked(r.name) ? <Badge variant="good">In Mandates</Badge> : <Badge variant="warn">Not tracked</Badge>)}
                  <span className={r.days_until < 0 ? "text-warn" : undefined}>{inr(r.amount_paise)}</span>
                </span>
              )} />
          ))}
        </RowList>
      )}
    </Card>
  );
}

/** Plain-language observations about when the user spends. */
export function PatternNotes({ notes, className }: { notes: string[]; className?: string }) {
  if (notes.length === 0) return null;
  return <ul className={className ?? "space-y-1.5 text-[13px] text-sub"}>{notes.map((n) => <li key={n}>{n}</li>)}</ul>;
}

/** Spending by weekday (Monday first) as bars, with the notes under it. */
export function WeekdayBars({ patterns }: { patterns: Patterns }) {
  const order = [1, 2, 3, 4, 5, 6, 0], max = Math.max(...patterns.weekdays.map((b) => b.paise), 1);
  return (
    <div className="space-y-3 text-[13px]">
      {order.map((d) => <BarRow key={d} label={DAYS[d]} value={inr(patterns.weekdays[d].paise)} ratio={patterns.weekdays[d].paise / max} />)}
      <PatternNotes notes={patterns.notes} className="space-y-1.5 border-t border-line pt-3 text-[13px] text-sub" />
    </div>
  );
}

/** Change against the same days last month: spending down is good (green), up is red. */
const delta = (now: number, prev: number) => (now === prev ? "same as last month" : `${now > prev ? "+" : "-"}${inr(Math.abs(now - prev))} vs last month`);

/** This month so far, against the same days last month, and where it is heading. */
export function PaceCard({ pace }: { pace: Pace }) {
  const { month_paise: now, prev_span_paise: prev } = pace;
  return (
    <Card title="This month's pace" icon={ChartLineUp}>
      <p className="mb-4 text-[14px] leading-relaxed">
        By day {pace.day} last month you had spent <b className="num">{inr(prev)}</b>. This month you have spent <b className="num">{inr(now)}</b>
        {now === prev ? ", exactly the same." : <>, which is <b className={`num ${now > prev ? "text-down" : "text-up"}`}>{inr(Math.abs(now - prev))} {now > prev ? "more" : "less"}</b>.</>}
        {pace.prev_month_paise > 0 && <> At this rate the month ends around <b className="num">{inr(pace.projected_paise)}</b>, {pace.projected_paise > pace.prev_month_paise ? "above" : "below"} last month's {inr(pace.prev_month_paise)}.</>}
      </p>
      <div className="grid grid-cols-3 gap-4">
        <div><div className="text-[12px] text-muted">Spent so far</div><div className="num mt-1 text-[22px] font-semibold leading-none">{inr(now)}</div>
          <div className={`mt-1.5 text-[11px] ${now > prev ? "text-down" : "text-up"}`}>{prev > 0 || now > 0 ? delta(now, prev) : ""}</div></div>
        <div><div className="text-[12px] text-muted">Daily average</div><div className="num mt-1 text-[22px] font-semibold leading-none">{inr(pace.daily_avg_paise)}</div><div className="mt-1.5 text-[11px] text-muted">day {pace.day} of {pace.days_in_month}</div></div>
        <div><div className="text-[12px] text-muted">On track for</div><div className="num mt-1 text-[22px] font-semibold leading-none">{inr(pace.projected_paise)}</div><div className="mt-1.5 text-[11px] text-muted">last month {inr(pace.prev_month_paise)}</div></div>
      </div>
    </Card>
  );
}

/** Each category's spend this month so far, with the change against the same days last month. */
export function MoversCard({ items }: { items: Mover[] }) {
  const max = Math.max(...items.flatMap((m) => [m.paise, m.prev_paise]), 1);
  return (
    <Card title="Where it's changing" icon={TrendUp}>
      {items.length === 0 ? <EmptyState icon={TrendUp}>No spending this month yet</EmptyState> : (
        <div className="space-y-3.5 text-[13px]">
          {items.map((m) => (
            <div key={m.name}>
              <BarRow label={m.name} value={inr(m.paise)} ratio={m.paise / max} />
              <div className="mt-1 h-1 bg-tint"><div className="h-1 bg-muted/50" style={{ width: `${(m.prev_paise / max) * 100}%` }} /></div>
              <div className="mt-1 text-[11px] text-muted">
                Same days last month {inr(m.prev_paise)} · <span className={m.paise > m.prev_paise ? "text-down" : "text-up"}>{m.paise === m.prev_paise ? "no change" : `${inr(Math.abs(m.paise - m.prev_paise))} ${m.paise > m.prev_paise ? "more" : "less"}`}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/** The payees that took the most this month. */
export function TopVendorsCard({ items, total }: { items: TopVendor[]; total: number }) {
  return (
    <Card title="Top payees this month" icon={Storefront}>
      {items.length === 0 ? <EmptyState icon={Storefront}>No spending this month yet</EmptyState> : (
        <RowList>
          {items.map((v) => (
            <ListRow key={v.name} title={v.name} subtitle={`${v.count} payment${v.count === 1 ? "" : "s"}${total > 0 ? ` · ${Math.round((v.paise / total) * 100)}% of spending` : ""}`} trailing={<span>{inr(v.paise)}</span>} />
          ))}
        </RowList>
      )}
    </Card>
  );
}
