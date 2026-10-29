import Link from "next/link";
import { Bank, ChartLineUp, HandCoins, type Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { inr } from "@/lib/money";
import type { Dashboard } from "@/lib/api";

const pct = (r: number) => `${r >= 0 ? "+" : ""}${(r * 100).toFixed(1)}%`;
/** One colour per slice of net worth, so the split reads at a glance. */
const SLICE: Record<string, string> = { Cash: "bg-emerald-400", "Mutual Funds": "bg-sky-400", Stocks: "bg-amber-400", Other: "bg-violet-400" };
const slice = (name: string) => SLICE[name] ?? "bg-ink/30";

/** Financial position on a blurred photo washed with white: net worth large, how it splits, then cash, investments and what is owed as a ruled list. */
export function PositionPanel({ p }: { p: Dashboard["position"] }) {
  const parts = p.allocation.filter((a) => a.paise > 0), total = parts.reduce((a, x) => a + x.paise, 0);
  const change = p.netWorthChangePaise;
  const rows: { label: string; value: string; sub: string; href: string; icon: Icon; tone?: string }[] = [
    { label: "Cash", value: inr(p.cashPaise), sub: `Across ${p.accounts} account${p.accounts === 1 ? "" : "s"}`, href: "/accounts", icon: Bank },
    { label: "Investments", value: inr(p.currentPaise), href: p.usesFunds ? "/funds" : "/profile", icon: ChartLineUp, tone: p.pnlPaise > 0 ? "text-green-700" : p.pnlPaise < 0 ? "text-red-700" : "",
      sub: p.investedPaise > 0 ? `${inr(p.investedPaise)} invested · ${p.pnlPaise >= 0 ? "+" : ""}${inr(p.pnlPaise)} (${pct(p.pnlPaise / p.investedPaise)})` : "Add holdings in About Me" },
    { label: "Owed", value: inr(p.liabilitiesPaise), sub: "Outstanding EMIs and loans. Not deducted", href: "/emis", icon: HandCoins, tone: p.liabilitiesPaise > 0 ? "text-amber-700" : "" },
  ];

  return (
    <div className="relative grid gap-10 overflow-hidden rounded-lg bg-cover bg-center p-5 text-ink md:p-8 lg:grid-cols-[1.3fr_1fr] lg:gap-12" style={{ backgroundImage: "url(/blur-bg.jpg)" }}>
      <div aria-hidden className="absolute inset-0 bg-white/60" />
      <div className="relative flex min-w-0 flex-col justify-between gap-6">
        <div>
          <Link href="/profile" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/60 hover:text-ink">Net worth</Link>
          <div className="num mt-3 text-[36px] font-semibold leading-none tracking-tight sm:text-[44px] md:text-[60px]">{inr(p.netWorthPaise)}</div>
          <div className={cn("mt-3 text-[13px]", change === undefined ? "text-ink/50" : change >= 0 ? "text-green-700" : "text-red-700")}>
            {change === undefined ? "No month-end recorded yet" : <>{change >= 0 ? "+" : ""}{inr(change)} <span className="text-ink/50">since {p.netWorthChangeSince ? new Date(`${p.netWorthChangeSince}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }) : "last month"}</span></>}
          </div>
        </div>
        {total > 0 && (
          <div>
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Net worth split">
              {parts.map((a) => <span key={a.name} className={slice(a.name)} style={{ width: `${(a.paise / total) * 100}%` }} />)}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink/70">
              {parts.map((a) => <li key={a.name} className="flex items-center gap-1.5"><span className={cn("size-2 rounded-full", slice(a.name))} />{a.name} {Math.round((a.paise / total) * 100)}%</li>)}
            </ul>
          </div>
        )}
      </div>
      <ul className="relative grid min-w-0 gap-3 self-stretch">
        {rows.map((r) => (
          <li key={r.label} className="flex">
            <Link href={r.href} className="flex min-h-[88px] flex-1 items-center gap-4 rounded-md bg-white/60 px-5 py-5 transition-colors hover:bg-white/80">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-ink/10"><r.icon size={20} weight="duotone" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/60">{r.label}</span>
                <span className={cn("num mt-1 block text-[22px] font-semibold leading-tight tracking-tight", r.tone)}>{r.value}</span>
                <span className="mt-1 block text-[12px] leading-snug text-ink/60">{r.sub}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
