"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Bank, ListBullets } from "@phosphor-icons/react";
import type { Account, TxnView } from "@/lib/api";
import { bankName } from "@/lib/banks";
import { cn } from "@/lib/cn";
import { inr } from "@/lib/money";
import { BankLogo } from "../atoms";
import { Card, EmptyState, Tabs } from "../molecules";

/** Money in plain green, money out plain red, everything else black. */
const SHADES = ["bg-ink", "bg-ink/70", "bg-ink/45", "bg-ink/25", "bg-ink/12"];
const shade = (i: number) => SHADES[Math.min(i, SHADES.length - 1)];

/** Where the money sits: total, one bar split by account, and each account's share. */
export function AccountBalances({ accounts, className }: { accounts: Account[]; className?: string }) {
  const part = (a: Account) => Math.max(a.balance_paise, 0);
  const total = accounts.reduce((s, a) => s + part(a), 0);
  const rows = [...accounts].sort((a, b) => b.balance_paise - a.balance_paise);
  return (
    <Card title="Where your money sits" icon={Bank} className={className}>
      {accounts.length === 0 ? (
        <EmptyState icon={Bank}>No accounts yet</EmptyState>
      ) : (
        <>
          <div className="text-[12px] text-muted">Total available balance</div>
          <div className="num mt-1 text-[30px] font-semibold leading-none">{inr(total)}</div>
          <div className="mt-4 flex h-2.5 gap-px bg-surface" aria-hidden>
            {total > 0 && rows.map((a, i) => <div key={a.id} className={shade(i)} style={{ width: `${(part(a) / total) * 100}%` }} />)}
          </div>
          <ul className="mt-4 divide-y divide-line-soft">
            {rows.map((a, i) => (
              <li key={a.id} className="flex items-center gap-3 py-2.5">
                <span className={cn("size-2.5 shrink-0", shade(i))} aria-hidden />
                <BankLogo bank={a.bank} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{a.name}</div>
                  <div className="num text-[12px] text-muted">{total > 0 ? `${((part(a) / total) * 100).toFixed(1)}% of total` : bankName(a.bank)}</div>
                </div>
                <div className="num text-[14px] font-semibold">{inr(a.balance_paise)}</div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[12px] text-muted">
            <span>{accounts.length} account{accounts.length === 1 ? "" : "s"}</span>
            <Link href="/accounts" className="font-medium text-ink underline underline-offset-2">Manage accounts</Link>
          </div>
        </>
      )}
    </Card>
  );
}

const IST = "Asia/Kolkata";
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: IST });
const dayLabel = (key: string, today: string, yesterday: string) =>
  key === today ? "Today" : key === yesterday ? "Yesterday" : new Date(`${key}T12:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: IST });
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: IST });
const signed = (paise: number) => `${paise > 0 ? "+" : paise < 0 ? "−" : ""}${inr(Math.abs(paise))}`;
const flowTone = (paise: number) => (paise > 0 ? "text-up" : paise < 0 ? "text-down" : "text-ink");

type Kind = "all" | "out" | "in";
const KINDS: { value: Kind; label: string }[] = [{ value: "all", label: "All" }, { value: "out", label: "Expenses" }, { value: "in", label: "Income" }];

function Stat({ label, value, tone, sub }: { label: string; value: string; tone: string; sub: string }) {
  return (
    <div>
      <div className="text-[12px] text-muted">{label}</div>
      <div className={cn("num mt-1 text-[22px] font-semibold leading-none sm:text-[26px]", tone)}>{value}</div>
      <div className="mt-1.5 text-[12px] text-muted">{sub}</div>
    </div>
  );
}

/** Today's transactions: what went out, what came in, the net, then the list grouped by day. */
export function RecentActivity({ txns, className }: { txns: TxnView[]; className?: string }) {
  const [kind, setKind] = useState<Kind>("all");
  const all = [...txns].sort((a, b) => b.at.localeCompare(a.at));
  const outs = all.filter((t) => !t.credit), ins = all.filter((t) => t.credit);
  const sum = (l: TxnView[]) => l.reduce((s, t) => s + t.paise, 0);
  const out = sum(outs), inn = sum(ins), net = inn - out;
  const shown = kind === "all" ? all : kind === "out" ? outs : ins;

  const now = Date.now(), today = dayKey(new Date(now).toISOString()), yesterday = dayKey(new Date(now - 864e5).toISOString());
  const groups: { key: string; items: TxnView[] }[] = [];
  for (const t of shown) {
    const k = dayKey(t.at), g = groups[groups.length - 1];
    if (g?.key === k) g.items.push(t); else groups.push({ key: k, items: [t] });
  }
  const count = (n: number) => `${n} transaction${n === 1 ? "" : "s"}`;

  return (
    <Card title="Recent activity" icon={ListBullets} className={className} action={<Tabs<Kind> value={kind} items={KINDS} onChange={setKind} />}>
      {all.length === 0 ? (
        <EmptyState>No transactions today</EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 border-b border-line pb-4">
            <Stat label="Money out" value={inr(out)} tone="text-down" sub={count(outs.length)} />
            <Stat label="Money in" value={inr(inn)} tone="text-up" sub={count(ins.length)} />
            <Stat label="Net flow" value={signed(net)} tone={flowTone(net)} sub="Today" />
          </div>
          {shown.length === 0 ? <p className="py-6 text-center text-[13px] text-muted">Nothing here today.</p> : groups.map((g) => {
            const gNet = g.items.reduce((s, t) => s + (t.credit ? t.paise : -t.paise), 0);
            return (
              <div key={g.key}>
                <div className="mt-4 flex items-baseline justify-between bg-tint px-3 py-1.5 text-[12px]">
                  <span className="font-semibold">{dayLabel(g.key, today, yesterday)}</span>
                  <span className={cn("num font-semibold", flowTone(gNet))}>Net {signed(gNet)}</span>
                </div>
                <ul className="divide-y divide-line-soft">
                  {g.items.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                      <span className={cn("grid size-8 shrink-0 place-items-center rounded-full border", t.credit ? "border-up text-up" : "border-down text-down")}>
                        {t.credit ? <ArrowDownLeft size={16} weight="bold" /> : <ArrowUpRight size={16} weight="bold" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-medium">{t.vendor}</div>
                        <div className="truncate text-[12px] text-muted">{t.source ? `${t.source} · ` : ""}{clock(t.at)}</div>
                      </div>
                      <div className={cn("num text-[15px] font-semibold", t.credit ? "text-up" : "text-down")}>{t.credit ? "+" : "−"}{inr(t.paise)}</div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <div className="mt-3 border-t border-line pt-3 text-right text-[12px]"><Link href="/transactions" className="font-medium text-ink underline underline-offset-2">View all transactions</Link></div>
        </>
      )}
    </Card>
  );
}
