"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Bell, Camera, ChartBar, FilePdf, FileText, GasPump, Gauge, MapPin, PencilSimple, Plus, ShieldCheck, Sparkle, Trash, UploadSimple, Wrench } from "@phosphor-icons/react";
import { Badge, Button, Select } from "@/components/atoms";
import { BarChart, BarRow, Card, EmptyState, ListRow, RowList, RowSkeleton, StatCard, StatSkeleton, Tabs } from "@/components/molecules";
import { LOG_KINDS, LogForm, Plate, VehicleForm, VehiclePhoto, insuranceLabel, logLabel, useDialogs, type LogDraft } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { api, uploadVehicleFile, useAct, useVehicle, useVehicleSuggestions, vehicleFileUrl, type DocKind, type VehicleDetail, type VehicleInput, type VehicleLog } from "@/lib/api";
import { inr } from "@/lib/money";

const DOC_KINDS: { value: DocKind; label: string }[] = [
  { value: "insurance", label: "Insurance policy" }, { value: "rc", label: "RC (registration)" }, { value: "puc", label: "PUC certificate" },
  { value: "service", label: "Service record" }, { value: "receipt", label: "Bill / receipt" }, { value: "other", label: "Other" },
];
type Filter = "all" | "fuel" | "upkeep" | "trip";
const FILTERS: { value: Filter; label: string }[] = [{ value: "all", label: "All" }, { value: "fuel", label: "Fuel" }, { value: "upkeep", label: "Upkeep" }, { value: "trip", label: "Trips" }];
const when = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const monthLabel = (ym: string) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" });
const km = (n: number) => `${Math.round(n).toLocaleString("en-IN")} km`;
const size = (b: number) => (b > 1 << 20 ? `${(b / (1 << 20)).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);

/** Opens the file picker and uploads what is picked; shows its own busy state. */
function UploadButton({ label, accept, onFile, variant = "ghost" }: { label: string; accept: string; onFile: (f: File) => Promise<void>; variant?: "ghost" | "solid" }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return <>
    <input ref={ref} type="file" accept={accept} hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; setBusy(true); try { await onFile(f); } finally { setBusy(false); } }} />
    <Button size="sm" variant={variant} icon={label.includes("photo") ? Camera : UploadSimple} loading={busy} onClick={() => ref.current?.click()}>{label}</Button>
  </>;
}

function LogRow({ l, electric, onEdit, onDelete }: { l: VehicleLog; electric: boolean; onEdit: () => void; onDelete: () => void }) {
  const K = LOG_KINDS.find((k) => k.value === l.kind)?.icon ?? Wrench;
  const bits = l.kind === "trip"
    ? [l.from ? `${l.from} → ${l.place}` : l.place, l.trip_km ? km(l.trip_km) : "", l.note]
    : [l.litres ? `${l.litres} ${electric ? "kWh" : "l"}${l.full_tank ? " (full)" : ""}` : "", l.odometer_km ? km(l.odometer_km) : "", l.place, l.note];
  return (
    <ListRow
      leading={<span className="grid size-9 shrink-0 place-items-center rounded-full bg-tint text-muted"><K size={17} weight="duotone" /></span>}
      title={<>{l.kind === "trip" ? l.place : logLabel(l.kind)}{l.txn_id && <Badge variant="outline" className="ml-2" title="Logged from a bank SMS">SMS</Badge>}</>}
      subtitle={[when(l.date), ...bits].filter(Boolean).join(" · ")}
      trailing={<span className="flex items-center gap-2">{l.amount_paise > 0 && inr(l.amount_paise)}
        <Button size="icon" variant="quiet" icon={PencilSimple} aria-label="Edit entry" onClick={onEdit} />
        <Button size="icon" variant="quiet" icon={Trash} aria-label="Delete entry" onClick={onDelete} /></span>} />
  );
}

/** The papers in the bucket: open, delete, or add one of a chosen kind. */
function Papers({ v }: { v: VehicleDetail }) {
  const dialogs = useDialogs();
  const act = useAct(["vehicles"]);
  const [kind, setKind] = useState<DocKind>("insurance");
  const upload = (f: File) => new Promise<void>((done) => act(() => uploadVehicleFile(v.id, kind, f), { ok: `${f.name} saved`, onSettled: done }));
  const docs = [...v.docs].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <Card title="Papers" icon={FileText} action={<span className="flex items-center gap-2">
      <Select size="sm" value={kind} onChange={(e) => setKind(e.target.value as DocKind)} className="w-44">{DOC_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</Select>
      <UploadButton label="Upload" accept="image/png,image/jpeg,image/webp,application/pdf" onFile={upload} />
    </span>}>
      {docs.length === 0 ? <EmptyState icon={FileText}>Keep the insurance policy, RC and PUC here so they are on your phone when you are stopped or need to claim. PDF or photo, up to 15 MB.</EmptyState> : (
        <RowList>
          {docs.map((d) => (
            <ListRow key={d.id} leading={<span className="grid size-9 shrink-0 place-items-center rounded-md bg-tint text-muted">{d.type === "application/pdf" ? <FilePdf size={17} weight="duotone" /> : <FileText size={17} weight="duotone" />}</span>}
              title={<a href={vehicleFileUrl(v.id, d.id)} target="_blank" rel="noreferrer" className="hover:underline">{d.name}</a>}
              subtitle={`${DOC_KINDS.find((k) => k.value === d.kind)?.label ?? d.kind} · ${size(d.size)} · ${new Date(d.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
              trailing={<Button size="icon" variant="quiet" icon={Trash} aria-label={`Delete ${d.name}`} onClick={async () => (await dialogs.confirm({ title: "Delete file?", message: `${d.name} will be removed from storage.`, confirmLabel: "Delete", tone: "danger" })) && act(() => api(`/vehicles/${v.id}/files/${d.id}`, { method: "DELETE" }), { ok: "File deleted" })} />} />
          ))}
        </RowList>
      )}
    </Card>
  );
}

export default function VehiclePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const dialogs = useDialogs();
  const q = useVehicle(id), sug = useVehicleSuggestions();
  const act = useAct(["vehicles"]);
  const [editing, setEditing] = useState(false);
  const [log, setLog] = useState<{ id?: string; initial: LogDraft } | undefined>();
  const [filter, setFilter] = useState<Filter>("all");
  const v = q.data, s = v?.stats;
  const electric = v?.fuel === "electric", unit = electric ? "km/kWh" : "km/l";

  const save = (input: VehicleInput) => act(() => api(`/vehicles/${id}`, { method: "PUT", body: input }), { ok: "Saved", onDone: () => setEditing(false) });
  const saveLog = (l: Omit<VehicleLog, "id">) =>
    act(() => (log?.id ? api(`/vehicles/${id}/logs/${log.id}`, { method: "PUT", body: l }) : api(`/vehicles/${id}/logs`, { method: "POST", body: l })), { ok: log?.id ? "Entry updated" : "Entry added", onDone: () => setLog(undefined) });
  const setPhoto = (f: File) => new Promise<void>((done) => act(() => uploadVehicleFile(id, "photo", f), { ok: "Photo updated", onSettled: done }));
  const remove = async () => {
    if (!v || !(await dialogs.confirm({ title: `Delete ${v.name}?`, message: "Its log, photo and papers will all be deleted.", confirmLabel: "Delete", tone: "danger" }))) return;
    act(() => api(`/vehicles/${id}`, { method: "DELETE" }), { ok: `${v.name} deleted`, onDone: () => router.push("/vehicles") });
  };

  const logs = (v?.logs ?? []).filter((l) => filter === "all" || (filter === "upkeep" ? l.kind !== "fuel" && l.kind !== "trip" : l.kind === filter));
  const kindMax = Math.max(...(s?.by_kind ?? []).map((k) => k.paise), 1);
  const pending = (sug.data ?? []).slice(0, 6);

  return (
    <PageLayout title={v?.name ?? "Vehicle"} icon={GasPump} error={q.error} description={v ? [v.make, v.model, v.year].filter(Boolean).join(" · ") || undefined : undefined}
      action={v && <span className="flex gap-2"><Button variant="ghost" icon={PencilSimple} onClick={() => setEditing(true)}>Edit</Button><Button variant="ghost" icon={Trash} aria-label="Delete vehicle" onClick={remove} /></span>}>
      <Link href="/vehicles" className="-mt-4 mb-5 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted hover:text-ink"><ArrowLeft size={13} weight="bold" />All vehicles</Link>

      {!v || !s ? <><StatSkeleton /><RowSkeleton /></> : <>
        {/* Hero: the vehicle large, with what matters beside it */}
        <section className="grid overflow-hidden rounded-lg border border-line bg-surface lg:grid-cols-[1.5fr_1fr]">
          <div className="relative">
            <VehiclePhoto v={v} className="h-72 sm:h-96" />
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <UploadButton label={v.photo ? "Change photo" : "Add photo"} accept="image/png,image/webp,image/jpeg" onFile={setPhoto} />
            </div>
            {!v.photo && <p className="absolute right-3 top-3 max-w-56 text-right text-[11px] text-muted">A PNG with a transparent background (a 3D render or a cut-out) looks best here.</p>}
          </div>
          <div className="flex flex-col gap-5 border-t border-line p-5 lg:border-l lg:border-t-0">
            <div className="flex flex-wrap items-center gap-3"><Plate plate={v.plate} /><Badge variant="neutral" className="capitalize">{v.fuel}</Badge><Badge variant="neutral" className="capitalize">{v.kind}</Badge></div>
            <div>
              <div className="eyebrow">Odometer</div>
              <div className="num mt-1 text-[32px] font-semibold leading-none tracking-tight">{s.odometer_km ? km(s.odometer_km) : "—"}</div>
              {s.km_per_month ? <div className="mt-1 text-[12px] text-muted">About {km(s.km_per_month)} a month</div> : null}
            </div>
            <div>
              <div className="eyebrow mb-2 flex items-center gap-1.5"><Bell size={12} weight="bold" />Renewals and service</div>
              {s.reminders.length === 0 ? <p className="text-[12px] text-muted">Add the insurance expiry, PUC date and service interval to get reminders on your phone.</p> : (
                <RowList>{s.reminders.map((r) => <ListRow key={r.kind} title={r.title} subtitle={when(r.date)} trailing={<Badge variant={r.tone}>{r.days < 0 ? "Overdue" : r.days === 0 ? "Today" : `${r.days}d`}</Badge>} />)}</RowList>
              )}
            </div>
            {(v.insurance.insurer || v.insurance.policy_no || v.insurance.type) && (
              <div className="rounded-md bg-tint px-3 py-2.5 text-[12px]">
                <div className="flex items-center gap-1.5 font-semibold"><ShieldCheck size={14} weight="duotone" />{v.insurance.insurer || "Insurance"}
                  {v.insurance.type && <Badge variant={v.insurance.type === "comprehensive" ? "good" : "warn"} className="ml-auto">{insuranceLabel(v.insurance.type)}</Badge>}</div>
                <div className="mt-0.5 text-muted">{[v.insurance.policy_no, v.insurance.premium_paise && `${inr(v.insurance.premium_paise)} a year`, v.insurance.idv_paise && `IDV ${inr(v.insurance.idv_paise)}`].filter(Boolean).join(" · ")}</div>
              </div>
            )}
            <div className="mt-auto flex flex-wrap gap-2">
              <Button icon={GasPump} onClick={() => setLog({ initial: { kind: "fuel" } })}>Add fuel</Button>
              <Button variant="ghost" icon={Wrench} onClick={() => setLog({ initial: { kind: "service" } })}>Upkeep</Button>
              <Button variant="ghost" icon={MapPin} onClick={() => setLog({ initial: { kind: "trip" } })}>Trip</Button>
            </div>
          </div>
        </section>

        <div className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard label="Mileage" icon={Gauge} value={s.avg_kmpl ? `${s.avg_kmpl} ${unit}` : "—"}
            tone={s.avg_kmpl && v.claimed_kmpl ? (s.avg_kmpl >= v.claimed_kmpl * 0.85 ? "good" : "warn") : "neutral"}
            sub={s.avg_kmpl ? [`last tank ${s.last_kmpl}`, `best ${s.best_kmpl}`, v.claimed_kmpl && `claimed ${v.claimed_kmpl}`].filter(Boolean).join(" · ") : "Log two full tanks with odometer readings"} />
          <StatCard label="Cost per km" value={s.run_per_km_paise ? inr(s.run_per_km_paise) : s.fuel_per_km_paise ? inr(s.fuel_per_km_paise) : "—"}
            sub={[s.fuel_per_km_paise && `fuel ${inr(s.fuel_per_km_paise)}/km`, s.run_per_km_paise && "everything, last 12 months", s.price_per_l && `₹${s.price_per_l}/${electric ? "kWh" : "l"} last fill`].filter(Boolean).join(" · ") || "Needs odometer readings"} />
          <StatCard label="This month" value={inr(s.month_paise)} sub={`${inr(s.year_paise)} in the last 12 months`} />
          <StatCard label="Next month's fuel" icon={Sparkle} tone="info" value={s.next_month_fuel_paise ? inr(s.next_month_fuel_paise) : "—"}
            sub={s.next_year_paise ? `About ${inr(s.next_year_paise)} to run it for the next 12 months, insurance included` : "Forecast once there is some history"} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card title="Spending, last 12 months" icon={ChartBar} className="lg:col-span-2">
            <BarChart label="Monthly vehicle spending" bars={s.months.map((m) => ({ key: m.month, value: m.fuel_paise + m.other_paise, title: `${monthLabel(m.month)}: ${inr(m.fuel_paise + m.other_paise)} (fuel ${inr(m.fuel_paise)}${m.litres ? `, ${m.litres} ${electric ? "kWh" : "l"}` : ""})` }))} height={140} />
            <div className="mt-2 flex justify-between text-[11px] text-muted"><span>{monthLabel(s.months[0].month)}</span><span>{monthLabel(s.months[11].month)}</span></div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line-soft pt-4 text-[12px] sm:grid-cols-4">
              <div><div className="text-muted">Range, full tank</div><div className="num mt-0.5 font-semibold">{s.range_km ? km(s.range_km) : "—"}</div></div>
              <div><div className="text-muted">{s.next_service?.planned ? "Service booked" : "Next service"}</div><div className="num mt-0.5 font-semibold">{s.next_service ? when(s.next_service.due_date) : "—"}</div>
                {s.next_service?.planned && s.next_service.suggested && <div className="text-faint">Suggested {when(s.next_service.suggested)}</div>}
                {s.next_service?.due_km ? <div className="text-faint">or at {km(s.next_service.due_km)}</div> : null}</div>
              <div><div className="text-muted">Trips</div><div className="num mt-0.5 font-semibold">{s.trips}{s.trip_km ? ` · ${km(s.trip_km)}` : ""}</div></div>
              <div><div className="text-muted">Spent in all</div><div className="num mt-0.5 font-semibold">{inr(s.total_paise)}</div></div>
            </div>
          </Card>
          <Card title="Where it goes" icon={Wrench}>
            {s.by_kind.length === 0 ? <EmptyState icon={Wrench}>Nothing logged yet.</EmptyState> : (
              <div className="space-y-3 text-[13px]">{s.by_kind.filter((k) => k.paise > 0).map((k) => <BarRow key={k.kind} label={`${logLabel(k.kind)} · ${k.count}`} value={inr(k.paise)} ratio={k.paise / kindMax} />)}</div>
            )}
            {s.fills.length > 1 && <div className="mt-5 border-t border-line-soft pt-4">
              <div className="eyebrow mb-2">Mileage per tank</div>
              <BarChart label="Mileage per tank" height={64} bars={s.fills.slice(-16).map((f) => ({ key: f.date + f.km, value: f.kmpl, title: `${when(f.date)}: ${f.kmpl} ${unit} over ${km(f.km)}` }))} />
            </div>}
          </Card>
        </div>

        {pending.length > 0 && (
          <Card title="From your bank SMS" icon={Sparkle} className="mt-4">
            <p className="mb-2 text-[12px] text-muted">Recent payments that look like fuel, tolls or upkeep. Log the ones for {v.name}; add litres and the odometer for mileage.</p>
            <RowList>{pending.map((p) => (
              <ListRow key={p.txn_id} title={p.vendor || logLabel(p.kind)} subtitle={`${when(p.date)} · looks like ${logLabel(p.kind).toLowerCase()}`}
                trailing={<span className="flex items-center gap-3">{inr(p.amount_paise)}<Button size="sm" variant="ghost" icon={Plus} onClick={() => setLog({ initial: { kind: p.kind, date: p.date, amount_paise: p.amount_paise, place: p.vendor, txn_id: p.txn_id } })}>Log</Button></span>} />
            ))}</RowList>
          </Card>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card title="Log" icon={GasPump} className="lg:col-span-2" action={<Tabs value={filter} onChange={setFilter} items={FILTERS} />}>
            {logs.length === 0 ? <EmptyState icon={filter === "trip" ? MapPin : GasPump}>{filter === "trip" ? "Log trips to keep a record of where you have been: from, to, distance and a note." : "Add fuel, service, washes and other costs as they happen, or log them from your bank SMS above."}</EmptyState> : (
              <RowList>{logs.map((l) => <LogRow key={l.id} l={l} electric={electric} onEdit={() => setLog({ id: l.id, initial: l })}
                onDelete={async () => (await dialogs.confirm({ title: "Delete entry?", message: `${logLabel(l.kind)} on ${when(l.date)} will be deleted.`, confirmLabel: "Delete", tone: "danger" })) && act(() => api(`/vehicles/${id}/logs/${l.id}`, { method: "DELETE" }), { ok: "Entry deleted" })} />)}</RowList>
            )}
          </Card>
          <Papers v={v} />
        </div>
      </>}

      {editing && v && <VehicleForm initial={v} onSave={save} onClose={() => setEditing(false)} />}
      {log && v && <LogForm key={log.id ?? "new"} initial={log.initial} editing={!!log.id} electric={electric} onSave={saveLog} onClose={() => setLog(undefined)} />}
    </PageLayout>
  );
}
