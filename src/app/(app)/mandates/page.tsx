"use client";

import { useState } from "react";
import { ArrowsClockwise, CalendarBlank, CalendarCheck, CalendarDots, CaretDown, Flag, PencilSimple, Plus, Sparkle, Trash, type Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { Badge, Button } from "@/components/atoms";
import { Card, EmptyState, ListRow, RowList, RowSkeleton, StatCard, StatSkeleton } from "@/components/molecules";
import { FREQUENCIES, MandateForm } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { api, type Mandate, type MandateInput, type MandateOcc, useAct, useMandateSuggestions, useMandates } from "@/lib/api";
import { inr } from "@/lib/money";

const freqLabel = (f: string) => FREQUENCIES.find((x) => x.value === f)?.label ?? f;
const when = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const inDays = (n: number) => (n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`);

const FREQ_ICON: Record<string, Icon> = { monthly: ArrowsClockwise, quarterly: CalendarBlank, yearly: CalendarCheck, "one-off": Flag };
/** Round tile: amber when due within a week, otherwise neutral. */
const FreqTile = ({ freq, soon }: { freq: string; soon: boolean }) => {
  const I = FREQ_ICON[freq] ?? CalendarBlank;
  return <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", soon ? "bg-warn-bg text-warn" : "bg-tint text-muted")}><I size={17} weight="duotone" /></span>;
};

/** One month as a Monday-first grid; days with a payment get a dark dot and a tooltip naming it. */
function MonthGrid({ ym, items }: { ym: string; items: MandateOcc[] }) {
  const first = new Date(`${ym}-01T00:00:00Z`);
  const lead = (first.getUTCDay() + 6) % 7, days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const byDay = new Map<number, MandateOcc[]>();
  for (const o of items) byDay.set(+o.date.slice(8), [...(byDay.get(+o.date.slice(8)) ?? []), o]);
  return (
    <div className="mb-3 grid grid-cols-7 gap-y-1 text-center text-[11px]">
      {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="text-faint">{d}</span>)}
      {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
      {Array.from({ length: days }, (_, i) => {
        const hit = byDay.get(i + 1);
        return <span key={i} title={hit?.map((o) => `${o.name} ${inr(o.paise)}`).join("\n")}
          className={cn("mx-auto grid size-6 place-items-center rounded-full", hit ? "bg-ink font-semibold text-white" : "text-muted")}>{i + 1}</span>;
      })}
    </div>
  );
}

/** The 12-month calendar: a collapsible card per month with its total, a day grid and the payments. The nearest two months start open. */
function Calendar({ occ }: { occ: MandateOcc[] }) {
  const months = new Map<string, MandateOcc[]>();
  for (const o of occ) months.set(o.date.slice(0, 7), [...(months.get(o.date.slice(0, 7)) ?? []), o]);
  return (
    <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[...months].map(([ym, items], n) => (
        <details key={ym} open={n < 2} className="group rounded-lg border border-line bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-md bg-tint"><CalendarBlank size={15} weight="duotone" /></span>
              <span className="text-[13px] font-semibold tracking-tight">{new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" })}</span>
            </span>
            <span className="flex items-center gap-2"><span className="num text-[13px] font-semibold">{inr(items.reduce((a, o) => a + o.paise, 0))}</span><CaretDown size={13} className="text-muted transition-transform group-open:rotate-180" /></span>
          </summary>
          <div className="border-t border-line-soft px-5 pb-4 pt-3">
            <MonthGrid ym={ym} items={items} />
            <RowList>{items.map((o, i) => <ListRow key={`${o.id}-${i}`} title={o.name} subtitle={`${when(o.date)} · ${inDays(o.days)}`} trailing={inr(o.paise)} />)}</RowList>
          </div>
        </details>
      ))}
    </div>
  );
}

export default function Mandates() {
  const q = useMandates(), sug = useMandateSuggestions();
  const act = useAct();
  // undefined = closed; otherwise the mandate being edited, or the starting values of a new one
  const [form, setForm] = useState<{ editing?: string; initial?: Partial<MandateInput> } | undefined>(undefined);
  const p = q.data;

  const save = (m: MandateInput) =>
    act(() => (form?.editing ? api(`/mandates/${form.editing}`, { method: "PUT", body: m }) : api("/mandates", { method: "POST", body: m })), { ok: form?.editing ? "Mandate updated" : "Mandate added", onDone: () => setForm(undefined) });
  const edit = (m: Mandate) => setForm({ editing: m.id, initial: m });

  return (
    <PageLayout title="Mandates" icon={CalendarDots} error={q.error} description="Everything you must pay in the next 12 months" action={<Button icon={Plus} disabled={!q.isSuccess} onClick={() => setForm({})}>Add mandate</Button>}>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {!p ? [0, 1, 2, 3].map((i) => <StatSkeleton key={i} />) : <>
          <StatCard label="Next 30 days" value={inr(p.next30_paise)} tone={p.next30_paise > 0 ? "warn" : "neutral"} />
          <StatCard label="Next 90 days" value={inr(p.next90_paise)} />
          <StatCard label="Next 12 months" value={inr(p.year_paise)} sub={`${p.calendar.length} payment${p.calendar.length === 1 ? "" : "s"}`} />
          <StatCard label="Set aside / month" value={inr(p.set_aside_paise)} tone="info" sub="Enough each month to meet every mandate on time" />
        </>}
      </div>

      {(sug.data?.length ?? 0) > 0 && (
        <Card title="Looks recurring" icon={Sparkle} className="mt-4">
          <p className="mb-2 text-[12px] text-muted">Found in your spending: same payee, similar amount, regular interval. Add the ones that are real.</p>
          <RowList>
            {sug.data!.map((s) => (
              <ListRow key={s.name} title={s.name} subtitle={`${freqLabel(s.frequency)} · seen ${s.count} times · next around ${when(s.next_due)}`} trailing={
                <span className="flex items-center gap-3">{inr(s.amount_paise)}<Button size="sm" variant="ghost" icon={Plus} onClick={() => act(() => api("/mandates", { method: "POST", body: { name: s.name, amount_paise: s.amount_paise, frequency: s.frequency, next_due: s.next_due } }), { ok: `${s.name} added` })}>Add</Button></span>
              } />
            ))}
          </RowList>
        </Card>
      )}

      <div className="mt-4">
        {q.isLoading ? <RowSkeleton /> : p && p.items.length === 0 ? (
          <div className="border border-line py-10">
            <EmptyState icon={CalendarDots}>Add insurance premiums, annual fees, school fees and other payments you cannot skip, to see what is coming and how much to set aside.</EmptyState>
            <div className="mt-4 flex justify-center"><Button icon={Plus} onClick={() => setForm({})}>Add your first mandate</Button></div>
          </div>
        ) : p && (
          <Card title="All mandates">
            <RowList>
              {p.items.map((m) => (
                <ListRow key={m.id} title={m.name} leading={<FreqTile freq={m.frequency} soon={!!m.next && m.days <= 7} />}
                  subtitle={<>{freqLabel(m.frequency)} · {m.next ? `next ${when(m.next)}, ${inDays(m.days)}` : "date has passed"}{m.frequency !== "monthly" && m.set_aside_paise > 0 && <> · set aside {inr(m.set_aside_paise)} / month</>}</>}
                  trailing={
                    <span className="flex items-center gap-2">
                      {!m.next && <Badge variant="warn">Passed</Badge>}{m.next && m.days <= 7 && <Badge variant="warn">{inDays(m.days)}</Badge>}{inr(m.amount_paise)}
                      <Button size="icon" variant="quiet" icon={PencilSimple} aria-label={`Edit ${m.name}`} onClick={() => edit(m)} />
                      <Button size="icon" variant="quiet" icon={Trash} aria-label={`Delete ${m.name}`} onClick={() => window.confirm(`Delete ${m.name}?`) && act(() => api(`/mandates/${m.id}`, { method: "DELETE" }), { ok: "Mandate deleted" })} />
                    </span>
                  } />
              ))}
            </RowList>
          </Card>
        )}
      </div>

      {p && p.calendar.length > 0 && <div className="mt-6"><h2 className="mb-3 text-[13px] font-semibold tracking-tight">Next 12 months</h2><Calendar occ={p.calendar} /></div>}

      {form && <MandateForm key={form.editing ?? "new"} initial={form.initial} editing={!!form.editing} onSave={save} onClose={() => setForm(undefined)} />}
    </PageLayout>
  );
}
