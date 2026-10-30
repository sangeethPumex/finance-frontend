"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowSquareOut, CaretDown, CreditCard, HandCoins, LinkSimple, PencilSimple, Plus, Receipt, Trash, Wallet } from "@phosphor-icons/react";
import { api, useAct, useCardActivity, useCardPayments, useAccounts, type Card } from "@/lib/api";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/dates";
import { inr } from "@/lib/money";
import { Button } from "../atoms";
import { Meter, Modal, SectionTitle, Tabs } from "../molecules";
import { CardFace } from "./card-face";
import { RecordPaymentDialog } from "./record-payment-dialog";

const rs = (n: number) => inr(Math.round(n * 100));
const inDays = (n: number) => (n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`);

/** Green under 30% of the limit, amber to 70%, red beyond: the bands credit scores care about. */
const tone = (u?: number) => (u === undefined || u < 0.3 ? "good" : u < 0.7 ? "warn" : "bad") as "good" | "warn" | "bad";
const kindLabel = (c: Card) => (c.kind === "paylater" ? "Pay later" : "Credit card");

/** The date of the next statement, from the days left to the billing day. */
export const nextStatement = (c: Card) => (c.days_to_billing === undefined ? undefined : new Date(Date.now() + c.days_to_billing * 864e5).toISOString());

/** Where the last bill stands, in words and colour. Null when the card has no statement to track. */
export function dueStatus(c: Card): { label: string; cls: string; open: boolean } | null {
  const st = c.statement;
  if (!st) return null;
  switch (st.status) {
    case "paid": return { label: "Paid", cls: "text-up", open: false };
    case "no_due": return { label: "Nothing due", cls: "text-muted", open: false };
    case "overdue": return { label: `Overdue by ${-st.days_to_due} day${st.days_to_due === -1 ? "" : "s"}`, cls: "text-down", open: true };
    case "partial": return { label: "Partly paid", cls: "text-warn", open: true };
    default: return { label: `Due ${inDays(st.days_to_due)}`, cls: st.days_to_due <= 3 ? "text-down" : st.days_to_due <= 7 ? "text-warn" : "text-ink", open: true };
  }
}

function Figure({ label, value, sub, cls }: { label: string; value: string; sub?: string; cls?: string }) {
  return <div className="min-w-0"><div className="text-[12px] text-muted">{label}</div><div className={cn("num mt-1 text-[20px] font-semibold leading-tight", cls)}>{value}</div>{sub && <div className="mt-0.5 text-[12px] text-muted">{sub}</div>}</div>;
}

/** One card: the card face, then the money. Click for the details. */
export function CardTile({ card: c, onEdit, defaultOpen = false }: { card: Card; onEdit: () => void; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const hasLimit = !!c.limit_paise, st = c.statement, ds = dueStatus(c), next = nextStatement(c);
  const shared = c.shared_cards.length > 0;

  return (
    <div className="border border-line bg-surface transition-shadow duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,.08)]">
      <button type="button" aria-haspopup="dialog" aria-label={`${c.name} details`} onClick={() => setOpen(true)} className="block w-full p-4 text-left">
        <CardFace card={c} />
        <div className="pt-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-[15px] font-semibold">{c.name}</span>
            {ds && <span className={cn("shrink-0 text-[12px] font-semibold", ds.cls)}>{ds.label}</span>}
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-4">
            <Figure label="Outstanding" value={inr(c.used_paise)} sub={shared ? "this card only" : undefined} />
            <Figure label="Available" value={hasLimit ? inr(c.available_paise ?? 0) : "–"} cls={hasLimit ? "text-up" : "text-muted"} sub={hasLimit ? undefined : "Add a limit"} />
          </div>
          {hasLimit && (
            <div className="mt-3">
              <Meter ratio={c.utilisation ?? 0} tone={tone(c.utilisation)} />
              <div className="num mt-1.5 flex justify-between text-[12px] text-muted"><span>{Math.round((c.utilisation ?? 0) * 100)}% {shared ? "of shared limit" : "utilisation"}</span><span>{inr(c.limit_paise!)} limit</span></div>
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-4 border-t border-line-soft pt-3">
            <Figure label="Next payment" value={st ? (ds?.open ? inr(st.unpaid_paise) : inr(0)) : "–"} sub={st ? (ds?.open ? `due ${shortDate(st.due_date)}` : "Already paid") : "Set billing and due dates"} />
            <Figure label="Next statement" value={next ? shortDate(next) : "–"} sub={next ? inDays(c.days_to_billing!) : undefined} />
          </div>
        </div>
      </button>
      {open && <CardDetail card={c} onEdit={() => { setOpen(false); onEdit(); }} onClose={() => setOpen(false)} />}
    </div>
  );
}

type Step = { date: string; title: string; sub: string; done: boolean };

/** The bill's life: statement, payments, the deadline, the next statement. Built from the statement and the payments since it. */
function Timeline({ card: c, payments }: { card: Card; payments: { at: string; amount_paise: number; from: string }[] }) {
  const st = c.statement, next = nextStatement(c);
  if (!st) return null;
  const steps: Step[] = [{ date: st.to, title: "Statement generated", sub: `Statement amount ${inr(st.billed_paise)}`, done: true }];
  for (const p of payments.filter((p) => p.at.slice(0, 10) >= st.to)) steps.push({ date: p.at, title: "Payment recorded", sub: `${inr(p.amount_paise)}${p.from ? ` from ${p.from}` : ""}`, done: true });
  steps.push({ date: st.due_date, title: "Payment deadline", sub: st.unpaid_paise > 0 ? `${inr(st.unpaid_paise)} remaining` : "Nothing remaining", done: st.unpaid_paise === 0 || st.days_to_due < 0 });
  if (next) steps.push({ date: next, title: "Next statement", sub: "Next billing cycle starts", done: false });
  steps.sort((a, b) => a.date.localeCompare(b.date));
  return (
    <ol className="relative ml-1.5 space-y-4 border-l border-line pl-5">
      {steps.map((s, i) => (
        <li key={i} className="relative">
          <span className={cn("absolute -left-[26px] top-1 size-2.5 rounded-full border-2 bg-surface", s.done ? "border-ink bg-ink" : "border-strong")} aria-hidden />
          <div className="flex items-baseline justify-between gap-3"><span className="text-[13px] font-medium">{s.title}</span><span className="num text-[12px] text-muted">{shortDate(s.date)}</span></div>
          <div className="num text-[12px] text-muted">{s.sub}</div>
        </li>
      ))}
    </ol>
  );
}

type Tab = "overview" | "transactions";
type Kind = "all" | "spends" | "credits";

/** Everything on the card: spends, refunds and payments, newest first, grouped by month. Rows read from a statement carry a badge. */
function CardTransactions({ card: c }: { card: Card }) {
  const { data, isLoading, error } = useCardActivity(c.id, 200);
  const [kind, setKind] = useState<Kind>("all");
  if (isLoading) return <p className="text-[13px] text-muted">Loading…</p>;
  if (error) return <p className="text-[13px] text-down">{error.message}</p>;
  const all = data ?? [];
  if (!all.length) return <p className="text-[13px] text-muted">No transactions on this card yet.{!c.last4 && " Add its last 4 digits so SMS can be matched."}</p>;
  const spends = all.filter((a) => a.kind === "purchase"), credits = all.filter((a) => a.kind !== "purchase");
  const sum = (l: typeof all) => l.reduce((t, a) => t + a.amount_paise, 0);
  const shown = kind === "all" ? all : kind === "spends" ? spends : credits;
  const months: { key: string; label: string; items: typeof all }[] = [];
  for (const a of shown) {
    const d = new Date(a.at), key = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7), g = months[months.length - 1];
    if (g?.key === key) g.items.push(a); else months.push({ key, label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" }), items: [a] });
  }
  return (
    <div>
      <div className="grid grid-cols-3 gap-3 border-b border-line pb-4">
        <Figure label="Spent" value={inr(sum(spends))} sub={`${spends.length} transaction${spends.length === 1 ? "" : "s"}`} />
        <Figure label="Refunds and payments" value={inr(sum(credits))} cls="text-up" sub={`${credits.length} transaction${credits.length === 1 ? "" : "s"}`} />
        <Figure label="Net" value={inr(sum(spends) - sum(credits))} sub="spent minus credits" />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <Tabs<Kind> value={kind} items={[{ value: "all", label: "All" }, { value: "spends", label: "Spends" }, { value: "credits", label: "Credits" }]} onChange={setKind} />
        <Link href="/transactions" className="flex items-center gap-1 text-[11px] font-medium text-muted hover:text-ink">Transactions page<ArrowSquareOut size={12} /></Link>
      </div>
      {months.map((m) => (
        <div key={m.key}>
          <div className="mt-4 bg-tint px-3 py-1.5 text-[12px] font-semibold">{m.label}</div>
          <ul className="divide-y divide-line-soft">
            {m.items.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-[13px]">
                <span className="min-w-0">
                  <span className="flex items-center gap-2"><span className="truncate font-medium">{a.vendor}</span>
                    {a.imported && <span className="shrink-0 bg-tint px-1.5 py-0.5 text-[10px] font-medium text-muted">Statement</span>}
                    {a.needs_review && <span className="shrink-0 bg-warn/10 px-1.5 py-0.5 text-[10px] font-medium text-warn">Review</span>}</span>
                  <span className="block truncate text-[11px] text-muted">{shortDate(a.at)} · {a.kind === "payment" ? `Card payment${a.source ? ` · ${a.source}` : ""}` : a.kind === "refund" ? "Refund" : a.category || "Uncategorised"}</span>
                </span>
                <span className={cn("num shrink-0 font-semibold", a.kind === "purchase" ? "text-ink" : "text-up")}>{a.kind === "purchase" ? "−" : "+"}{inr(a.amount_paise)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function CardDetail({ card: c, onEdit, onClose }: { card: Card; onEdit: () => void; onClose: () => void }) {
  const act = useAct();
  const [tab, setTab] = useState<Tab>("overview");
  const [paying, setPaying] = useState(false);
  const pays = useCardPayments(c.id), activity = useCardActivity(c.id), accounts = useAccounts().data ?? [];
  const st = c.statement, ds = dueStatus(c), hasLimit = !!c.limit_paise, shared = c.shared_cards.length > 0;
  const Icon = c.kind === "paylater" ? HandCoins : CreditCard;
  const from = (p: { account_id?: string; bank?: string; account_last4?: string }) => accounts.find((a) => a.id === p.account_id)?.name ?? (p.bank ? `${p.bank}${p.account_last4 ? ` ••${p.account_last4}` : ""}` : "");
  const list = (pays.data ?? []).map((p) => ({ ...p, from: from(p) }));
  const remove = (id: string) => act(() => api(`/cards/${c.id}/payments/${id}`, { method: "DELETE" }), { ok: "Payment removed" });

  return (
    <Modal title={c.name} subtitle={`${kindLabel(c)}${c.bank ? ` · ${c.bank}` : ""}${c.last4 ? ` · ••${c.last4}` : ""}`} icon={Icon} wide onClose={onClose}>
      <div className="mb-5"><Tabs<Tab> value={tab} items={[{ value: "overview", label: "Overview" }, { value: "transactions", label: "Transactions" }]} onChange={setTab} /></div>
      {tab === "transactions" ? <CardTransactions card={c} /> : <>
      <div className="grid gap-6 md:grid-cols-[minmax(0,260px)_1fr] md:gap-8">
        <CardFace card={c} height={150} />
        <div>
          <div className="grid grid-cols-2 gap-4">
            <div><div className="text-[12px] text-muted">Current outstanding</div><div className="num mt-1 text-[28px] font-semibold leading-none">{inr(c.used_paise)}</div><div className="mt-1.5 text-[11px] text-muted">{c.outstanding_paise !== undefined ? "As you entered it" : "Estimated from your transactions"}</div></div>
            {hasLimit && <div><div className="text-[12px] text-muted">Available limit</div><div className="num mt-1 text-[28px] font-semibold leading-none text-up">{inr(c.available_paise ?? 0)}</div></div>}
          </div>
          {hasLimit && (
            <div className="mt-4">
              <Meter ratio={c.utilisation ?? 0} tone={tone(c.utilisation)} />
              <div className="num mt-1.5 flex justify-between text-[12px] text-muted"><span>{Math.round((c.utilisation ?? 0) * 100)}% utilised</span><span>{inr(c.limit_paise!)} {shared ? "shared limit" : "limit"}</span></div>
              {shared && <p className="mt-1 text-[12px] text-muted">Shared with {c.shared_cards.join(", ")}. Available credit is for the whole group.</p>}
            </div>
          )}
        </div>
      </div>

      <section className="mt-6 border border-line p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><div className="text-[12px] text-muted">Payment status</div><div className={cn("mt-0.5 text-[16px] font-semibold", ds?.cls)}>{ds ? (ds.open ? ds.label : ds.label === "Paid" ? "Paid, nothing due" : ds.label) : "Not tracked"}</div></div>
          <Button icon={Plus} onClick={() => setPaying(true)}>Record payment</Button>
        </div>
        {st ? (
          <>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Figure label="Statement amount" value={inr(st.billed_paise)} sub={`as of ${shortDate(st.to)}`} />
              <Figure label="Paid so far" value={inr(st.paid_paise)} cls={st.paid_paise > 0 ? "text-up" : undefined} />
              <Figure label="Remaining due" value={inr(st.unpaid_paise)} cls={st.status === "overdue" ? "text-down" : st.unpaid_paise > 0 ? "text-warn" : "text-up"} sub={st.unpaid_paise > 0 ? `by ${shortDate(st.due_date)}` : undefined} />
            </div>
            {st.unpaid_paise > 0 && <p className="num mt-3 text-[12px] text-muted">Minimum due {inr(st.min_due_paise)}</p>}
          </>
        ) : <p className="mt-3 text-[12px] text-muted">Set the billing date and last date to pay on this card to track each statement.</p>}
      </section>

      {st && <div className="mt-6"><SectionTitle icon={Receipt}>Statement timeline</SectionTitle><Timeline card={c} payments={list} /></div>}

      <div className="mt-6">
        <SectionTitle icon={Wallet} action={<Link href="/transactions" className="flex items-center gap-1 text-[11px] font-medium text-muted hover:text-ink">All transactions<ArrowSquareOut size={12} /></Link>}>Recent card activity</SectionTitle>
        {activity.isLoading ? <p className="text-[13px] text-muted">Loading…</p> : !activity.data?.length ? <p className="text-[13px] text-muted">No spends or payments linked to this card yet.{!c.last4 && " Add its last 4 digits so SMS can be matched."}</p> : (
          <ul className="divide-y divide-line-soft">
            {activity.data.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                <span className="min-w-0"><span className="block truncate font-medium">{a.vendor}</span><span className="block text-[11px] text-muted">{shortDate(a.at)} · {a.kind === "purchase" ? "Purchase" : a.kind === "refund" ? "Refund" : `Card payment${a.source ? ` · ${a.source}` : ""}`}</span></span>
                <span className={cn("num shrink-0 font-semibold", a.kind === "purchase" ? "text-ink" : "text-up")}>{a.kind === "purchase" ? "−" : "+"}{inr(a.amount_paise)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <SectionTitle icon={Receipt}>Payment history</SectionTitle>
        {pays.isLoading ? <p className="text-[13px] text-muted">Loading…</p> : pays.error ? <p className="text-[13px] text-down">{pays.error.message}</p> : !list.length ? (
          <p className="text-[13px] text-muted">No payments yet. Record one above, or mark a bank transaction as &ldquo;Credit card payments&rdquo; and pick this card.</p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {list.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                <span className="min-w-0"><span className="block font-medium">Paid on {shortDate(p.at)}</span><span className="block truncate text-[11px] text-muted">{p.source === "manual" ? "Recorded by you" : "From your bank SMS"}{p.from && ` · ${p.from}`}{p.note && ` · ${p.note}`}</span></span>
                <span className="flex shrink-0 items-center gap-2"><span className="num font-semibold text-up">{inr(p.amount_paise)}</span>
                  {p.source === "manual" && <button type="button" aria-label="Remove payment" onClick={() => remove(p.id)} className="grid size-7 place-items-center text-muted hover:text-down"><Trash size={14} /></button>}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <details className="group mt-6 border-t border-line pt-4 text-[13px]">
        <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">More details<CaretDown size={14} className="transition-transform group-open:rotate-180" /></summary>
        <dl className="mt-4 space-y-2">
          {([
            ["Statement date", c.billing_day ? `Day ${c.billing_day} of every month${c.days_to_billing !== undefined ? ` · ${inDays(c.days_to_billing)}` : ""}` : "Not set"],
            ["Last date to pay", c.due_day ? `Day ${c.due_day} of every month${c.days_to_due !== undefined ? ` · ${inDays(c.days_to_due)}` : ""}` : "Not set"],
            ["Cycle started", shortDate(c.cycle_start)],
            ["Payments this cycle", st ? inr(st.paid_paise) : "–"],
            ["Spends this cycle", `${inr(c.cycle_spent_paise)} · ${c.cycle_txns} transaction${c.cycle_txns === 1 ? "" : "s"}`],
            ...(shared ? [["Group outstanding", inr(c.group_used_paise ?? 0)]] as const : []),
            ...(st && st.unpaid_paise > 0 ? [[`Interest if only minimum is paid (${st.apr}% a year)`, inr(st.interest_if_min_paise)], ["Interest if unpaid", inr(st.interest_if_skipped_paise)]] as const : []),
          ] as const).map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="num text-right font-medium">{v}</dd></div>)}
        </dl>
        {c.linked_emis.length > 0 && (
          <div className="mt-4">
            <SectionTitle icon={LinkSimple} action={<Link href="/emis" className="flex items-center gap-1 text-[11px] font-medium text-muted hover:text-ink">Manage<ArrowSquareOut size={12} /></Link>}>Linked loans</SectionTitle>
            <ul className="divide-y divide-line-soft">
              {c.linked_emis.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2"><span className="font-medium">{e.name}{!e.active && <span className="ml-2 bg-tint px-1.5 py-0.5 text-[11px] text-muted">Closed</span>}</span><span className="num text-right">{rs(e.left)}<span className="block text-[11px] text-muted">{rs(e.monthly)}/mo</span></span></li>
              ))}
            </ul>
          </div>
        )}
        {!c.last4 && c.outstanding_paise === undefined && <p className="mt-4 bg-tint p-3 text-[12px] text-muted">No last 4 digits, so no SMS are linked and spends stay at zero. Add them, or enter the outstanding from your app.</p>}
      </details>
      </>}

      <div className="mt-6 flex border-t border-line pt-4"><Button variant="ghost" icon={PencilSimple} onClick={onEdit}>Edit card</Button></div>
      {paying && <RecordPaymentDialog card={c} onClose={() => setPaying(false)} />}
    </Modal>
  );
}
