"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowSquareOut, CalendarCheck, CaretRight, CreditCard, Gauge, HandCoins, LinkSimple, PencilSimple, Receipt, ShareNetwork, ShoppingBag, Wallet } from "@phosphor-icons/react";
import type { Card } from "@/lib/api";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/dates";
import { inr } from "@/lib/money";
import { BankLogo, Button } from "../atoms";
import { Meter, Modal, SectionTitle } from "../molecules";

const rs = (n: number) => inr(Math.round(n * 100));
const ord = (n: number) => `${n}${[11, 12, 13].includes(n % 100) ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
const inDays = (n: number) => (n === 1 ? "tomorrow" : `in ${n} days`);

/** Green under 30% of the limit, amber to 70%, red beyond: the bands credit scores care about. */
const tone = (u?: number) => (u === undefined || u < 0.3 ? "good" : u < 0.7 ? "warn" : "bad") as "good" | "warn" | "bad";
const kindLabel = (c: Card) => (c.kind === "paylater" ? "Pay later" : "Credit card");

function DueChip({ days }: { days?: number }) {
  if (days === undefined || days > 7) return null;
  return <span className={cn("px-1.5 py-0.5 text-[11px] font-semibold", days <= 3 ? "bg-loss-bg text-loss" : "bg-warn/10 text-warn")}>due {inDays(days)}</span>;
}

/** One line of the tile footer: icon, caption, value. */
function Fact({ icon: Icon, label, children }: { icon: typeof Receipt; label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-[11px] font-medium text-muted"><Icon size={13} />{label}</div>
      <div className="mt-1 text-[13px] font-semibold">{children}</div>
    </div>
  );
}

/** A card at a glance: limit use first, then the dates and this cycle's spends. Click for the details. */
export function CardTile({ card: c, onEdit }: { card: Card; onEdit: () => void }) {
  const [open, setOpen] = useState(false);
  const Icon = c.kind === "paylater" ? HandCoins : CreditCard;
  const hasLimit = !!c.limit_paise;
  const linkedActive = c.linked_emis.filter((e) => e.active).length;
  const st = c.statement;

  return (
    <div className="border border-line bg-white">
      <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className="block w-full p-5 text-left">
        <div className="flex items-center gap-3">
          <BankLogo bank={c.bank} className="size-10" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5"><span className="truncate text-[15px] font-semibold">{c.name}</span><CaretRight size={13} className="shrink-0 text-muted" /></div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted"><Icon size={13} />{kindLabel(c)}{c.bank && ` · ${c.bank}`}{c.last4 && <span className="num"> · ••{c.last4}</span>}</div>
          </div>
          <DueChip days={c.days_to_due} />
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-3">
            <span><span className="num text-[26px] font-light leading-none tracking-tight">{inr(c.used_paise)}</span><span className="ml-1.5 text-[12px] text-muted">used{c.shared_cards.length > 0 && " by this card"}</span></span>
            {hasLimit && <span className="num text-[12px] text-muted">{c.shared_cards.length > 0 ? `${inr(c.group_used_paise ?? 0)} of ` : "of "}{inr(c.limit_paise!)}</span>}
          </div>
          {c.shared_cards.length > 0 && <div className="mt-2 flex items-center gap-1.5 text-[12px] text-sub"><ShareNetwork size={13} className="shrink-0 text-muted" /><span className="truncate">Limit shared with <span className="font-semibold">{c.shared_cards.join(", ")}</span></span></div>}
          {hasLimit ? (
            <>
              <div className="mt-3"><Meter ratio={c.utilisation ?? 0} tone={tone(c.utilisation)} /></div>
              <div className="mt-2 flex justify-between text-[12px]"><span className="font-semibold text-gain">{inr(c.available_paise ?? 0)} available</span><span className="num font-medium text-muted">{Math.round((c.utilisation ?? 0) * 100)}% {c.shared_cards.length > 0 ? "of shared limit" : "used"}</span></div>
            </>
          ) : <p className="mt-2 text-[12px] text-muted">Add a limit to see what is left to spend.</p>}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line-soft pt-4">
          <Fact icon={Receipt} label="Billing">{c.billing_day ? <>{ord(c.billing_day)}<span className="block text-[11px] font-normal text-muted">{c.days_to_billing !== undefined && inDays(c.days_to_billing)}</span></> : <span className="text-muted">Not set</span>}</Fact>
          <Fact icon={CalendarCheck} label="Pay by">{c.due_day ? <>{ord(c.due_day)}<span className="block text-[11px] font-normal text-muted">{c.days_to_due !== undefined && inDays(c.days_to_due)}</span></> : <span className="text-muted">Not set</span>}</Fact>
          <Fact icon={ShoppingBag} label="This cycle"><span className="num">{inr(c.cycle_spent_paise)}</span><span className="block text-[11px] font-normal text-muted">{c.cycle_txns} spend{c.cycle_txns === 1 ? "" : "s"}</span></Fact>
        </div>
        {st && st.unpaid_paise > 0 && (
          <div className={cn("mt-4 px-3 py-2 text-[12px]", st.overdue ? "bg-loss-bg text-loss" : st.remind ? "bg-warn/10 text-warn" : "bg-tint text-sub")}>
            <span className="font-semibold">Pay {inr(st.unpaid_paise)} in full</span> {st.overdue ? `· overdue by ${-st.days_to_due} day${st.days_to_due === -1 ? "" : "s"}` : `by ${shortDate(st.due_date)}`}
            <span className="block text-[11px] opacity-80">Otherwise about {inr(st.interest_if_min_paise)} interest next month</span>
          </div>
        )}
        {linkedActive > 0 && (
          <div className="mt-4 flex items-center gap-1.5 bg-tint px-3 py-2 text-[12px] text-sub">
            <LinkSimple size={14} weight="bold" className="text-muted" />
            <span className="font-semibold">{linkedActive} linked loan{linkedActive === 1 ? "" : "s"}</span>
            <span className="num ml-auto text-muted">{inr(c.linked_monthly_paise)}/mo</span>
          </div>
        )}
      </button>

      {open && (
        <Modal title={c.name} subtitle={`${kindLabel(c)}${c.bank ? ` · ${c.bank}` : ""}${c.last4 ? ` · ••${c.last4}` : ""}`} icon={Icon} wide onClose={() => setOpen(false)}>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="num text-[30px] font-light leading-none tracking-tight">{inr(c.used_paise)}</div>
              <div className="mt-1.5 text-[12px] text-muted">{c.outstanding_paise !== undefined ? "Outstanding, as you entered it" : "Estimated used: this cycle's spends plus linked loans"}</div>
            </div>
            {hasLimit && <div className="text-right"><div className="num text-[18px] font-semibold text-gain">{inr(c.available_paise ?? 0)}</div><div className="text-[12px] text-muted">available of {inr(c.limit_paise!)}{c.shared_cards.length > 0 && " (shared)"}</div></div>}
          </div>
          {hasLimit && <div className="mb-6"><Meter ratio={c.utilisation ?? 0} tone={tone(c.utilisation)} /><p className="mt-1.5 text-[12px] text-muted">{Math.round((c.utilisation ?? 0) * 100)}% of {c.shared_cards.length > 0 ? "the shared limit" : "your limit"}. Staying under 30% helps your credit score.</p></div>}

          <div className="grid gap-6 text-[13px] md:grid-cols-2">
            <div>
              <SectionTitle icon={Gauge}>Billing</SectionTitle>
              <dl className="space-y-2">
                {([
                  ...(c.shared_cards.length > 0 ? [["Shared limit", `${c.shared_with_name ? `Drawn from ${c.shared_with_name}` : "Held by this card"} · with ${c.shared_cards.join(", ")}`], ["Group used", inr(c.group_used_paise ?? 0)]] as const : []),
                  ["Statement date", c.billing_day ? `${ord(c.billing_day)} of every month${c.days_to_billing !== undefined ? ` · ${inDays(c.days_to_billing)}` : ""}` : "Not set"],
                  ["Last date to pay", c.due_day ? `${ord(c.due_day)} of every month${c.days_to_due !== undefined ? ` · ${inDays(c.days_to_due)}` : ""}` : "Not set"],
                  ...(st ? [
                    [`Last statement (${shortDate(st.to)})`, inr(st.billed_paise)],
                    ["Paid since", inr(st.paid_paise)],
                    ["Pay in full", `${inr(st.unpaid_paise)} by ${shortDate(st.due_date)}`],
                    ["Minimum due", inr(st.min_due_paise)],
                    [`Interest if only minimum (${st.apr}% a year)`, inr(st.interest_if_min_paise)],
                    ["Interest if unpaid", inr(st.interest_if_skipped_paise)],
                  ] as const : []),
                  ["Cycle started", shortDate(c.cycle_start)],
                  ["Spends this cycle", `${inr(c.cycle_spent_paise)} · ${c.cycle_txns} transaction${c.cycle_txns === 1 ? "" : "s"}`],
                  ["Linked loans", `${inr(c.linked_left_paise)} left · ${inr(c.linked_monthly_paise)}/mo`],
                ] as const).map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="num text-right font-medium">{v}</dd></div>)}
              </dl>
              {!c.last4 && c.outstanding_paise === undefined && <p className="mt-3 bg-tint p-3 text-[12px] text-muted">No last 4 digits, so no SMS are linked and spends stay at zero. Add them, or enter the outstanding from your app.</p>}
            </div>
            <div>
              <SectionTitle icon={LinkSimple} action={<Link href="/emis" className="flex items-center gap-1 text-[11px] font-medium text-muted hover:text-ink">Manage<ArrowSquareOut size={12} /></Link>}>Linked loans</SectionTitle>
              {c.linked_emis.length === 0 ? <p className="text-muted">None. Pick this card when adding a loan or instalment plan on the EMIs page.</p> : (
                <ul className="divide-y divide-line-soft">
                  {c.linked_emis.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="flex items-center gap-2 font-medium"><Wallet size={14} className="text-muted" />{e.name}{!e.active && <span className="bg-tint px-1.5 py-0.5 text-[11px] font-medium text-muted">Closed</span>}</span>
                      <span className="num text-right">{rs(e.left)}<span className="block text-[11px] text-muted">{rs(e.monthly)}/mo</span></span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="mt-6 flex border-t border-line pt-4"><Button variant="ghost" icon={PencilSimple} onClick={() => { setOpen(false); onEdit(); }}>Edit card</Button></div>
        </Modal>
      )}
    </div>
  );
}
