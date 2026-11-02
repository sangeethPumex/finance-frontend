"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BellSlash, CalendarDots, Check, ClockCountdown, CreditCard, Fire, HourglassMedium, Lightbulb, Repeat, Scales, ShoppingBag, Sparkle, Trash, Tray, X } from "@phosphor-icons/react";
import { type Advice, type CheckResult, type CopilotOverview, type Inbox, type Nudge, type Subscription, type Want, type Week, api, useAct, useCopilotCheck } from "@/lib/api";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/dates";
import { inr, rupeesToPaise } from "@/lib/money";
import { Badge, type BadgeVariant, Button, Input } from "../atoms";
import { Card, EmptyState, FormField, ListRow, Meter, RowList, SectionTitle, Tabs, toneText } from "../molecules";

const COPILOT_KEYS = ["copilot", "copilot-nudges", "copilot-wants"];
const days = (d: number) => `${d.toFixed(d < 10 ? 1 : 0)} day${d === 1 ? "" : "s"}`;
const whole = (paise: number) => inr(Math.round(paise / 100) * 100);
const VERDICT: Record<CheckResult["verdict"], BadgeVariant> = { buy: "good", wait: "warn", skip: "bad" };

/** One nudge, always with the same way out: dismiss, snooze a day, or never this kind again. */
export function NudgeRow({ n, compact }: { n: Nudge; compact?: boolean }) {
  const act = useAct(COPILOT_KEYS);
  const set = (action: "dismiss" | "acted" | "snooze", ok?: string) => act(() => api(`/copilot/nudges/${n.id}`, { method: "POST", body: { action } }), { ok });
  const answer = (glad: boolean) => act(async () => {
    await api(`/copilot/wants/${n.ref}`, { method: "PATCH", body: { glad } });
    await api(`/copilot/nudges/${n.id}`, { method: "POST", body: { action: "acted" } });
  }, { ok: "Thanks, noted" });
  return (
    <div className={cn("border-l-[3px] bg-tint px-4 py-3", { good: "border-gain", warn: "border-warn", bad: "border-loss", info: "border-info" }[n.tone])}>
      <p className="text-[14px] font-semibold text-ink">{n.title}</p>
      <p className="mt-0.5 text-[13px] text-sub">{n.body}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {n.kind === "reflect" && n.ref && <><Button size="sm" onClick={() => answer(true)}>Yes, glad</Button><Button size="sm" variant="ghost" onClick={() => answer(false)}>No, regret it</Button></>}
        {n.kind === "big_spend" && <Button size="sm" onClick={() => set("acted", "Logged as planned")}>Log as planned</Button>}
        {n.actionHref && <Link href={n.actionHref} onClick={() => set("acted")} className="inline-flex h-10 items-center gap-1.5 bg-ink px-3 text-xs font-medium text-white md:h-8">{n.actionLabel} <ArrowRight size={12} /></Link>}
        <Button size="sm" variant="ghost" onClick={() => set("dismiss")}>Dismiss</Button>
        <Button size="sm" variant="quiet" onClick={() => set("snooze", "Snoozed for a day")}>Snooze 1 day</Button>
        {!compact && <Button size="sm" variant="quiet" onClick={() => act(async () => {
          await api(`/copilot/mutes/${n.kind}`, { method: "PUT", body: { muted: true } });
          await api(`/copilot/nudges/${n.id}`, { method: "POST", body: { action: "dismiss" } });
        }, { ok: "You won't see this kind again" })}>Don&apos;t show this kind</Button>}
      </div>
    </div>
  );
}

/** The top of the dashboard: the one number, how today is going, and the one thing worth saying now. */
export function NowCard({ o, className }: { o: CopilotOverview; className?: string }) {
  const { safe: s, runway: r, confidence: c } = o;
  const act = useAct(COPILOT_KEYS);
  const goal = `${s.mode.months} month${s.mode.months === 1 ? "" : "s"}`;
  const seen = c.accountsTotal > 0 && c.accountsSeen < c.accountsTotal ? `Based on ${c.accountsSeen} of ${c.accountsTotal} accounts active in the last 30 days.` : "";
  const notes = [seen, ...c.notes].filter(Boolean);
  return (
    <Card title="Now" icon={Sparkle} className={className} action={<Link href="/copilot" className="text-[12px] font-medium text-sub underline underline-offset-2">Can I buy this?</Link>}>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        <div>
          <Tabs value={s.mode.key} items={s.modes.map((m) => ({ value: m.key, label: m.label }))} onChange={(mode) => act(() => api("/copilot/mode", { method: "PUT", body: { mode } }))} />
          <div className="mt-4 text-[12px] text-muted">Safe to spend today</div>
          <div className={cn("num mt-1 whitespace-nowrap text-[40px] font-semibold leading-none sm:text-[52px]", toneText[s.tone])}>{whole(s.todayPaise)}</div>
          <div className="mt-4"><Meter ratio={s.ratio} tone={s.tone} /></div>
          <div className="num mt-1.5 flex flex-wrap justify-between gap-x-3 text-[12px] text-muted">
            <span>Spent {inr(s.spentPaise)}</span>
            <span>{s.leftPaise >= 0 ? `${whole(s.leftPaise)} left` : `${whole(-s.leftPaise)} over`} · tomorrow {whole(s.tomorrowPaise)}</span>
          </div>
          <p className={cn("mt-3 text-[13px]", s.onFloor ? "text-warn" : "text-sub")}>
            {s.mode.label} aims for {goal} without salary. {s.onFloor
              ? <>You&apos;re <b className="num font-semibold">{whole(s.shortPaise)}</b> short, so this is the mode&apos;s minimum ({s.mode.floorPct}% of a usual day). At this budget, cash lasts <b className="num font-semibold">{days(s.sustainDays)}</b>.</>
              : <>At this budget, cash lasts <b className="num font-semibold">{days(s.sustainDays)}</b>.</>}
          </p>
          <details className="mt-3 text-[12px] text-muted">
            <summary className="cursor-pointer">Here&apos;s the maths</summary>
            <p className="num mt-1.5">(Cash {inr(s.cashPaise)} − {goal} of commitments {inr(s.committedPaise)} − buffer {inr(s.bufferPaise)}) ÷ {s.mode.months * 30} days = {whole(s.goalPaise)} a day</p>
            <ul className="mt-1 space-y-0.5">
              {s.fixedPaise > 0 && <li className="flex justify-between gap-3"><span>Fixed costs</span><span className="num">{inr(s.fixedPaise)}</span></li>}
              {s.committed.map((e) => <li key={e.name} className="flex justify-between gap-3"><span className="truncate">{e.name}{e.count && e.count > 1 ? ` × ${e.count}` : ` · ${shortDate(e.date)}`}</span><span className="num">{inr(-e.paise)}</span></li>)}
            </ul>
            <p className="mt-1">SIPs are left out: they pause if the salary stops.</p>
          </details>
        </div>
        <div className="space-y-3">
          {o.top ? <NudgeRow n={o.top} compact /> : <p className="text-[13px] text-muted">Nothing needs you right now.</p>}
          <dl className="grid grid-cols-2 gap-3 text-[12px] text-muted">
            <div><dt>Runway</dt><dd className="num mt-0.5 text-[18px] font-semibold text-ink">{days(r.days)}</dd></div>
            {r.goalDays > 0 && <div><dt>Emergency fund</dt><dd className="num mt-0.5 text-[18px] font-semibold text-ink">{Math.round(Math.min(r.days, r.goalDays))} of {Math.round(r.goalDays)} days</dd></div>}
          </dl>
          {r.recapText && <p className="text-[13px] text-sub">{r.recapText}</p>}
        </div>
      </div>
      {notes.length > 0 && <p className="mt-4 border-t border-line-soft pt-3 text-[12px] text-muted">{notes.join(" ")} Based on your numbers, not a guarantee.</p>}
    </Card>
  );
}

/** Money in, money out and the danger day for the coming week. */
export function WeekAhead({ w, className }: { w: Week; className?: string }) {
  return (
    <Card title="Week ahead" icon={CalendarDots} className={className}>
      <div className="num flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
        <span>In <b className="font-semibold text-gain">{inr(w.inPaise)}</b></span>
        <span>Out <b className="font-semibold text-loss">{inr(w.outPaise)}</b></span>
        <span>Safe <b className="font-semibold text-ink">{whole(w.safePerDayPaise)}/day</b></span>
      </div>
      <p className={cn("mt-2 text-[13px]", w.aboveBuffer ? "text-sub" : "text-loss")}>
        Lowest balance <b className="num font-semibold">{whole(w.lowestPaise)}</b> on {new Date(w.lowestDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}, {w.aboveBuffer ? "above your buffer" : "below your buffer"}.
        {w.priciest && ` ${w.priciest} is usually your priciest day.`}
      </p>
      {w.events.length > 0 && <div className="mt-2"><RowList>{w.events.map((e) => <ListRow key={`${e.name}-${e.date}`} title={e.name} subtitle={shortDate(e.date)} trailing={<span className={e.paise > 0 ? "text-gain" : undefined}>{inr(Math.abs(e.paise))}</span>} />)}</RowList></div>}
    </Card>
  );
}

function Scenarios({ c }: { c: CheckResult }) {
  const rows: [string, (s: CheckResult["scenarios"][number]) => React.ReactNode][] = [
    ["Date", (s) => shortDate(s.date)],
    ["Runway after", (s) => days(s.runwayAfter)],
    ["Safe per day", (s) => whole(s.safePerDayPaise)],
    ["Commitments", (s) => (s.uncovered ? <span className="text-loss">{s.uncovered} short</span> : <span className="text-gain">Covered</span>)],
    ["Card interest", (s) => inr(s.interestPaise)],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[460px] text-[13px]">
        <thead><tr className="border-b border-line text-left text-[12px] text-muted"><th scope="col" className="py-2 pr-3 font-medium"><span className="sr-only">Measure</span></th>{c.scenarios.map((s) => <th scope="col" key={s.label} className="py-2 pr-3 font-medium">{s.label}</th>)}</tr></thead>
        <tbody className="divide-y divide-line-soft">{rows.map(([label, cell]) => <tr key={label}><th scope="row" className="py-2 pr-3 text-left font-normal text-muted">{label}</th>{c.scenarios.map((s) => <td key={s.label} className="num py-2 pr-3">{cell(s)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/** "Can I buy this?": four lines in the same order every time, then what waiting would change. Advice only; nothing is blocked. */
export function PurchaseCheck() {
  const [name, setName] = useState(""), [amount, setAmount] = useState(""), [need, setNeed] = useState(false), [onCard, setOnCard] = useState(false), [uses, setUses] = useState(""), [replaces, setReplaces] = useState("");
  const check = useCopilotCheck(), act = useAct(COPILOT_KEYS);
  const paise = rupeesToPaise(amount), c = check.data;
  const park = (remindOn: string) => c && act(() => api("/copilot/wants", { method: "POST", body: { name: c.name || "Purchase", amountPaise: c.amountPaise, need, uses: Number(uses) || 0, remindOn } }), { ok: `Parked. We'll ask again on ${shortDate(remindOn)}` });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paise && paise > 0) check.mutate({ name: name.trim(), amountPaise: paise, need, onCard, uses: Number(uses) || 0, replacesPaise: rupeesToPaise(replaces) ?? 0 });
  };
  return (
    <Card title="Can I buy this?" icon={Scales}>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FormField label="What"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Headphones" /></FormField>
        <FormField label="Price (₹)" error={amount && !(paise && paise > 0) ? "Enter an amount" : undefined}><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="6000" /></FormField>
        <FormField label="Times you'll use it" hint="Optional"><Input inputMode="numeric" value={uses} onChange={(e) => setUses(e.target.value.replace(/\D/g, ""))} /></FormField>
        <FormField label="Monthly cost it replaces (₹)" hint="Optional"><Input inputMode="decimal" value={replaces} onChange={(e) => setReplaces(e.target.value)} /></FormField>
        <div className="flex flex-wrap items-center gap-5 text-[13px] text-sub sm:col-span-2 xl:col-span-4">
          <label className="flex items-center gap-2"><input type="checkbox" checked={need} onChange={(e) => setNeed(e.target.checked)} className="accent-ink" />I need this (not just want it)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={onCard} onChange={(e) => setOnCard(e.target.checked)} className="accent-ink" />Paying by card</label>
          <Button type="submit" className="ml-auto" loading={check.isPending} disabled={!paise || paise <= 0}>Check</Button>
        </div>
      </form>
      {check.error && <p className="mt-3 text-[13px] text-loss">{check.error.message}</p>}
      {c && (
        <div className="mt-5 space-y-4 border-t border-line pt-5">
          <div className="flex flex-wrap items-center gap-3"><Badge variant={VERDICT[c.verdict]} className="px-2 py-1 text-[13px]">{c.headline}</Badge>{c.costPerUsePaise ? <span className="num text-[13px] text-muted">{inr(c.costPerUsePaise)} per use</span> : null}{c.paybackMonths ? <span className="num text-[13px] text-muted">Pays for itself in {c.paybackMonths.toFixed(1)} months</span> : null}</div>
          <ul className="space-y-1 text-[14px] text-sub">
            <li><b className="font-semibold text-ink">Cost in runway:</b> <span className="num">{days(c.runwayCost)}</span> ({Math.round(c.runwayBefore)} → {Math.round(c.runwayAfter)})</li>
            <li><b className="font-semibold text-ink">Cost in plans:</b> {c.planCost} Safe to spend goes from <span className="num">{whole(c.safeBeforePaise)}</span> to <span className="num">{whole(c.safeAfterPaise)}</span> a day.</li>
            {c.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
          <div><SectionTitle icon={HourglassMedium}>If you wait</SectionTitle><Scenarios c={c} /></div>
          <p className="text-[13px] text-sub">Save <b className="num font-semibold">{whole(c.savePerDayPaise)}</b> a day and you can buy it outright on {shortDate(c.saveBy)}, no card. As a {c.emi.months}-month EMI it would cost about <b className="num font-semibold">{whole(c.emi.extraPaise)}</b> extra (assuming {c.emi.ratePct}% a year and a {c.emi.feePct}% fee), so it isn&apos;t worth it unless cash is tight.</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" icon={ClockCountdown} onClick={() => park(c.coolOff)}>Remind me on {shortDate(c.coolOff)}</Button>
            <Link href={`/ai?q=${encodeURIComponent(`Why is the verdict "${c.headline}" for a ₹${Math.round(c.amountPaise / 100)} purchase? What would change it?`)}`} className="inline-flex h-10 items-center gap-1.5 border border-strong px-3 text-xs font-medium text-muted hover:bg-tint hover:text-sub md:h-8"><Sparkle size={13} />Ask why</Link>
            <span className="text-[12px] text-muted">If you still want it in 14 days, it&apos;s probably a real want.</span>
          </div>
        </div>
      )}
    </Card>
  );
}

/** The cooling-off list: wants wait here and each shows today's answer. */
export function WantsList({ items }: { items: Want[] }) {
  const act = useAct(COPILOT_KEYS);
  const set = (w: Want, status: Want["status"], ok: string) => act(() => api(`/copilot/wants/${w.id}`, { method: "PATCH", body: { status } }), { ok });
  const parked = items.filter((w) => w.status === "parked"), bought = items.filter((w) => w.status === "bought");
  return (
    <Card title="Cooling off" icon={ShoppingBag}>
      {parked.length === 0 && bought.length === 0 ? <EmptyState icon={ShoppingBag} className="py-6">Check a purchase above and park it here instead of buying today.</EmptyState> : (
        <RowList>
          {parked.map((w) => (
            <li key={w.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
              <span className="min-w-0 flex-1 basis-40">
                <span className="block truncate font-medium">{w.link ? <a href={w.link} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{w.name}</a> : w.name}</span>
                <span className="block truncate text-xs text-muted">{w.remindAt ? `Asking again ${shortDate(w.remindAt)}` : "No reminder"}{w.check?.earliest ? ` · affordable from ${shortDate(w.check.earliest)}` : ""}</span>
              </span>
              <span className="num font-medium">{inr(w.amountPaise)}</span>
              {w.check && <Badge variant={VERDICT[w.check.verdict]}>{w.check.headline}</Badge>}
              <span className="flex gap-1">
                <Button size="icon" variant="ghost" icon={Check} aria-label={`Bought ${w.name}`} onClick={() => set(w, "bought", "Logged as planned. We'll check in next week")} />
                <Button size="icon" variant="quiet" icon={X} aria-label={`Drop ${w.name}`} onClick={() => set(w, "dropped", `Dropped. ${inr(w.amountPaise)} kept`)} />
              </span>
            </li>
          ))}
          {bought.map((w) => (
            <ListRow key={w.id} title={w.name} subtitle={w.glad === undefined ? "Bought. We'll check in after a week" : w.glad ? "Glad you bought it" : "You regretted this"} trailing={<span className="flex items-center gap-2">{inr(w.amountPaise)}<Button size="icon" variant="quiet" icon={Trash} aria-label={`Remove ${w.name}`} onClick={() => act(() => api(`/copilot/wants/${w.id}`, { method: "DELETE" }))} /></span>} />
          ))}
        </RowList>
      )}
    </Card>
  );
}

/** Streaks and what the history says, kept quiet. */
export function HabitsCard({ o }: { o: CopilotOverview }) {
  const h = o.habits;
  return (
    <Card title="Habits" icon={Fire}>
      <dl className="grid grid-cols-2 gap-3 text-[12px] text-muted">
        <div><dt>Under safe amount</dt><dd className="num mt-0.5 text-[20px] font-semibold text-ink">{h.underStreak} day{h.underStreak === 1 ? "" : "s"}</dd></div>
        <div><dt>No-spend streak</dt><dd className="num mt-0.5 text-[20px] font-semibold text-ink">{h.noSpendStreak} day{h.noSpendStreak === 1 ? "" : "s"}</dd></div>
      </dl>
      {h.notes.length > 0 ? <ul className="mt-3 space-y-1.5 border-t border-line pt-3 text-[13px] text-sub">{h.notes.map((n) => <li key={n}>{n}</li>)}</ul> : <p className="mt-3 border-t border-line pt-3 text-[13px] text-muted">Patterns appear after four weeks of history.</p>}
    </Card>
  );
}

/** Which card to use, what to pay before a statement, and the cost of paying the minimum. */
export function CardAdviceCard({ items, className }: { items: Advice[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <Card title="Smart card advice" icon={CreditCard} className={className}>
      <ul className="space-y-3">{items.map((a) => <li key={`${a.kind}-${a.card}`}><p className="text-[14px] font-medium text-ink">{a.title}</p><p className="text-[13px] text-sub">{a.body}</p></li>)}</ul>
    </Card>
  );
}

/** Each active recurring charge as what cancelling it would give back. */
export function SubscriptionsCard({ items }: { items: Subscription[] }) {
  return (
    <Card title="What cancelling gives back" icon={Repeat}>
      {items.length === 0 ? <EmptyState icon={Repeat} className="py-6">No active recurring charges found yet</EmptyState> : (
        <RowList>
          {items.map((s) => (
            <ListRow key={`${s.name}-${s.cadence}`} title={s.name}
              subtitle={`+${s.runwayDaysPerMonth.toFixed(1)} runway days a month · ${inr(s.yearlyPaise)} a year`}
              trailing={<span className="flex items-center gap-2">{s.raisedPaise ? <Badge variant="warn">Up {inr(s.raisedPaise)}</Badge> : null}{inr(s.amountPaise)}</span>} />
          ))}
        </RowList>
      )}
    </Card>
  );
}

/** Everything the app has said, and the kinds that are switched off. */
export function NudgeInbox({ inbox }: { inbox: Inbox }) {
  const act = useAct(COPILOT_KEYS);
  return (
    <Card title="Inbox" icon={Tray} action={inbox.active.length > 0 ? <Badge variant="solid">{inbox.active.length}</Badge> : undefined}>
      {inbox.active.length === 0 ? <EmptyState icon={Lightbulb} className="py-6">Nothing waiting. Silence is a feature</EmptyState> : <div className="space-y-3">{inbox.active.map((n) => <NudgeRow key={n.id} n={n} />)}</div>}
      {inbox.history.length > 0 && (
        <details className="mt-4 text-[13px]">
          <summary className="cursor-pointer text-muted">Earlier ({inbox.history.length})</summary>
          <RowList>{inbox.history.map((n) => <ListRow key={n.id} title={n.title} subtitle={`${shortDate(n.createdAt)} · ${n.state === "acted" ? "Acted on" : "Dismissed"}`} />)}</RowList>
        </details>
      )}
      {inbox.muted.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <SectionTitle icon={BellSlash}>Switched off</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {inbox.muted.map((m) => <Button key={m.kind} size="sm" variant="ghost" title={m.auto ? "Switched off because these kept being dismissed" : undefined} onClick={() => act(() => api(`/copilot/mutes/${m.kind}`, { method: "PUT", body: { muted: false } }), { ok: `${m.label} back on` })}>{m.label}{m.auto ? " (auto)" : ""} · Turn on</Button>)}
          </div>
        </div>
      )}
    </Card>
  );
}
