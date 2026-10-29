"use client";

import { Repeat, Warning } from "@phosphor-icons/react";
import type { Anomaly, Patterns, Recurring } from "@/lib/api";
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
