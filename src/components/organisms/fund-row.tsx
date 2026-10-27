"use client";

import { ArrowDownRight, ArrowUpRight, CaretRight, ChartLineUp, Coins, Globe, ShieldCheck, type Icon } from "@phosphor-icons/react";
import type { FundType, FundView, SipStatus } from "@/lib/api";
import { cn } from "@/lib/cn";
import { inr } from "@/lib/money";

export const rs = (n: number) => inr(Math.round(n * 100));
export const pct = (r: number) => `${r >= 0 ? "+" : ""}${(r * 100).toFixed(1)}%`;
export const chip = (n: number) => (n > 0 ? "bg-gain-bg text-gain" : n < 0 ? "bg-loss-bg text-loss" : "bg-tint text-muted");
export const SIP_TONE: Record<SipStatus, string> = { active: "bg-gain-bg text-gain", paused: "bg-warn/10 text-warn", cancelled: "bg-loss-bg text-loss" };
export const sipStatus = (f: FundView): SipStatus => f.sip?.status ?? "active";
export const TYPE_ICON: Record<FundType, Icon> = { Equity: ChartLineUp, Debt: ShieldCheck, Metal: Coins, Foreign: Globe };

/** Column layout shared by the header and every row, so numbers line up. Below md the row stacks. */
export const FUND_COLS = "md:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)]";

export function FundListHeader() {
  const h = "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted";
  return (
    <div className={cn("hidden gap-x-4 border-b border-line bg-subtle px-4 py-2 md:grid", FUND_COLS)}>
      <span className={h}>Fund</span><span className={cn(h, "text-right")}>Invested</span><span className={cn(h, "text-right")}>Current</span><span className={cn(h, "text-right")}>Returns</span><span className={cn(h, "text-right")}>SIP</span>
    </div>
  );
}

function Money({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={cn("text-right", className)}><div className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-faint md:hidden">{label}</div>{children}</div>;
}

/** One holding: type icon and name on the left, then invested, current, returns and SIP in aligned columns. Opens the details popup. */
export function FundRow({ fund: f, share, onOpen }: { fund: FundView; share: number; onOpen: () => void }) {
  const Icon = TYPE_ICON[f.type];
  return (
    <button type="button" aria-haspopup="dialog" onClick={onOpen} className={cn("group grid w-full grid-cols-2 items-center gap-x-4 gap-y-3 px-4 py-3.5 text-left transition-colors hover:bg-hover md:py-3", FUND_COLS)}>
      <div className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-tint text-sub"><Icon size={18} weight="duotone" /></span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5"><span className="truncate text-[14px] font-semibold">{f.name}</span><CaretRight size={12} className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5" /></div>
          <div className="mt-0.5 truncate text-[12px] text-muted">{[f.fundHouse, f.type, f.platform].filter(Boolean).join(" · ")}</div>
        </div>
      </div>
      <Money label="Invested" className="text-left md:text-right"><span className="num text-[13px] text-sub">{rs(f.invested)}</span></Money>
      <Money label="Current"><span className="num text-[14px] font-semibold">{rs(f.value)}</span><div className="num text-[11px] text-muted">{share > 0 ? `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}% of total` : ""}</div></Money>
      <Money label="Returns" className="text-left md:text-right">
        <span className={cn("num inline-flex items-center gap-1 px-1.5 py-0.5 text-[12px] font-semibold", chip(f.pnl))}>
          {f.pnl > 0 ? <ArrowUpRight size={12} weight="bold" /> : f.pnl < 0 ? <ArrowDownRight size={12} weight="bold" /> : null}{f.returnPct !== undefined ? pct(f.returnPct) : rs(f.pnl)}
        </span>
        <div className="num mt-0.5 text-[11px] text-muted">{f.pnl >= 0 ? "+" : ""}{rs(f.pnl)}</div>
      </Money>
      <Money label="SIP">
        {f.sip ? (
          <>
            <span className="num text-[13px] font-medium">{rs(f.sip.amount)}</span>
            <div className="mt-0.5 flex items-center justify-end gap-1.5 text-[11px] text-muted">
              {sipStatus(f) === "active" ? <>{f.sip.day}th{f.sipInDays !== undefined && ` · ${f.sipInDays}d`}</> : <span className={cn("px-1 py-px font-medium capitalize", SIP_TONE[sipStatus(f)])}>{sipStatus(f)}</span>}
            </div>
          </>
        ) : f.membership === "Genius" ? <span className="text-[12px] text-muted">In basket SIP</span> : <span className="text-[12px] text-faint">No SIP</span>}
      </Money>
    </button>
  );
}

/** A fund that left the portfolio: what it was sold for and the gain booked. */
export function ExitedRow({ fund: f, onOpen }: { fund: FundView; onOpen: () => void }) {
  const Icon = TYPE_ICON[f.type];
  return (
    <button type="button" aria-haspopup="dialog" onClick={onOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left opacity-80 transition-colors hover:bg-hover hover:opacity-100">
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-tint text-muted"><Icon size={18} weight="duotone" /></span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium">{f.name}</div>
        <div className="mt-0.5 text-[12px] text-muted">Moved out {f.exitedAt ?? ""} · {rs(f.invested)} in, {rs(f.proceeds ?? 0)} out</div>
      </div>
      <span className={cn("num shrink-0 px-1.5 py-0.5 text-[12px] font-semibold", chip(f.pnl))}>{f.pnl >= 0 ? "+" : ""}{rs(f.pnl)}</span>
    </button>
  );
}
