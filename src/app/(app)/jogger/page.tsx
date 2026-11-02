"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bell, CheckCircle, Circle, ListChecks, PencilSimple, Plus, ShoppingCart, Trash } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { Badge, Button } from "@/components/atoms";
import { Card, EmptyState, RowSkeleton } from "@/components/molecules";
import { JoggerForm, PushCard } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { api, type JoggerInput, type JoggerItem, type JoggerList, useAct, useJogger } from "@/lib/api";
import { inr } from "@/lib/money";

const whenText = (iso: string) => {
  const d = new Date(iso), now = new Date();
  const day = d.toDateString() === now.toDateString() ? "Today" : d.toDateString() === new Date(now.getTime() + 864e5).toDateString() ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return `${day}, ${d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}`;
};

/** "in 25 min", "in 3 hr", "in 2 days", or how long ago it was due. */
const rel = (iso: string) => {
  const m = Math.round((new Date(iso).getTime() - Date.now()) / 60000), a = Math.abs(m);
  const span = a < 60 ? `${a} min` : a < 1440 ? `${Math.round(a / 60)} hr` : `${Math.round(a / 1440)} day${Math.round(a / 1440) === 1 ? "" : "s"}`;
  return m >= 0 ? (m === 0 ? "now" : `in ${span}`) : `${span} ago`;
};

function ListCard({ l, onEdit, onToggle, onDone, onDelete }: { l: JoggerList; onEdit: () => void; onToggle: (it: JoggerItem) => void; onDone: () => void; onDelete: () => void }) {
  const shopping = l.kind === "shopping";
  const left = l.items.filter((i) => !i.bought), leftPaise = left.reduce((a, i) => a + i.est_paise, 0);
  const overdue = new Date(l.remind_at).getTime() < Date.now();
  return (
    <Card title={l.title} icon={shopping ? ShoppingCart : Bell} action={
      <span className="flex items-center gap-1">
        <Badge variant={overdue ? "bad" : new Date(l.remind_at).getTime() - Date.now() < 36e5 ? "warn" : "neutral"}>{rel(l.remind_at)}</Badge>
        <Button size="icon" variant="quiet" icon={PencilSimple} aria-label={`Edit ${l.title}`} onClick={onEdit} />
        <Button size="icon" variant="quiet" icon={Trash} aria-label={`Delete ${l.title}`} onClick={onDelete} />
      </span>
    }>
      <p className="mb-3 text-xs text-muted">{whenText(l.remind_at)}{l.lead_mins.length > 0 && ` · alerts ${l.lead_mins.slice().sort((a, b) => b - a).map((m) => (m === 0 ? "on time" : m >= 60 ? `${m / 60}h before` : `${m}m before`)).join(", ")}`}</p>
      {shopping ? (
        <>
          <ul className="divide-y divide-line-soft">
            {l.items.map((it) => (
              <li key={it.id}>
                <button type="button" onClick={() => onToggle(it)} aria-pressed={it.bought} className="flex min-h-11 w-full items-center gap-3 py-2 text-left">
                  {it.bought ? <CheckCircle size={22} weight="fill" className="shrink-0 text-gain" /> : <Circle size={22} className="shrink-0 text-faint" />}
                  <span className={cn("min-w-0 flex-1 truncate font-medium", it.bought && "text-faint line-through")}>{it.name}</span>
                  {it.est_paise > 0 && <span className={cn("num shrink-0 text-[13px]", it.bought ? "text-faint line-through" : "text-sub")}>{inr(it.est_paise)}</span>}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-3">
            <span className="text-xs text-muted">{left.length} left{leftPaise > 0 && <> · about <span className="num font-medium text-sub">{inr(leftPaise)}</span></>}</span>
            <Button size="sm" icon={CheckCircle} onClick={onDone}>Mark all bought</Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[13px] text-sub">{l.note || "No note"}</span>
          <Button size="sm" icon={CheckCircle} onClick={onDone}>Done</Button>
        </div>
      )}
    </Card>
  );
}

export default function Jogger() {
  const q = useJogger(), act = useAct(["jogger"]);
  // undefined = closed; null = a new list; otherwise the one being edited
  const [form, setForm] = useState<JoggerList | null | undefined>(undefined);
  const ls = q.data;

  const save = (v: JoggerInput) =>
    act(() => (form ? api(`/jogger/${form.id}`, { method: "PUT", body: v }) : api("/jogger", { method: "POST", body: v })), { ok: form ? "Saved" : "Added", onDone: () => setForm(undefined) });
  const toggle = (l: JoggerList, it: JoggerItem) =>
    act(async () => {
      const r = await api<{ deleted: boolean }>(`/jogger/${l.id}/items/${it.id}`, { method: "PUT", body: { bought: !it.bought } });
      if (r.deleted) toast.success(`${l.title}: everything bought, list cleared`);
    });
  const finish = (l: JoggerList) => act(() => api(`/jogger/${l.id}`, { method: "DELETE" }), { ok: l.kind === "shopping" ? `${l.title} cleared` : "Done" });
  const remove = (l: JoggerList) => window.confirm(`Delete ${l.title}?`) && act(() => api(`/jogger/${l.id}`, { method: "DELETE" }), { ok: "Deleted" });

  return (
    <PageLayout title="Brain Jogger" icon={ListChecks} error={q.error} description="Shopping lists and things to remember, with a nudge before they are due" action={<Button icon={Plus} disabled={!q.isSuccess} onClick={() => setForm(null)}>New</Button>}>
      <PushCard />
      {q.isLoading ? <RowSkeleton /> : ls && ls.length === 0 ? (
        <div className="border border-line py-10">
          <EmptyState icon={ListChecks}>Add a shopping list with what you expect to spend, or a reminder, and get a notification before it is time.</EmptyState>
          <div className="mt-4 flex justify-center"><Button icon={Plus} onClick={() => setForm(null)}>Add your first list</Button></div>
        </div>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ls?.map((l) => <ListCard key={l.id} l={l} onEdit={() => setForm(l)} onToggle={(it) => toggle(l, it)} onDone={() => finish(l)} onDelete={() => remove(l)} />)}
        </div>
      )}
      {form !== undefined && <JoggerForm key={form?.id ?? "new"} initial={form ?? undefined} onSave={save} onClose={() => setForm(undefined)} />}
    </PageLayout>
  );
}
