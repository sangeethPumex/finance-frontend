"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Car, Plus } from "@phosphor-icons/react";
import { Badge, Button } from "@/components/atoms";
import { EmptyState, RowSkeleton, StatCard, StatSkeleton } from "@/components/molecules";
import { Plate, VehicleForm, VehiclePhoto } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { api, type Vehicle, type VehicleInput, useAct, useVehicles } from "@/lib/api";
import { inr } from "@/lib/money";

const km = (n: number) => `${n.toLocaleString("en-IN")} km`;

/** One vehicle as a showroom card: the photo large, the plate, and what needs attention. */
function VehicleCard({ v }: { v: Vehicle }) {
  const s = v.stats;
  const urgent = s.reminders.filter((r) => r.tone !== "good");
  return (
    <Link href={`/vehicles/${v.id}`} className="group overflow-hidden rounded-lg border border-line bg-surface transition-shadow hover:shadow-[0_6px_18px_rgba(0,0,0,.08)]">
      <VehiclePhoto v={v} className="h-56 transition-transform duration-500 group-hover:scale-[1.02]" />
      <div className="border-t border-line-soft px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[16px] font-semibold tracking-tight">{v.name}</div>
            <div className="truncate text-[12px] text-muted">{[v.make, v.model, v.year].filter(Boolean).join(" · ") || (v.kind === "bike" ? "Bike" : "Car")}</div>
          </div>
          <Plate plate={v.plate} size="sm" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-[12px]">
          <div><div className="text-muted">Odometer</div><div className="num mt-0.5 font-semibold">{s.odometer_km ? km(s.odometer_km) : "—"}</div></div>
          <div><div className="text-muted">Mileage</div><div className="num mt-0.5 font-semibold">{s.avg_kmpl ? `${s.avg_kmpl} km/${v.fuel === "electric" ? "kWh" : "l"}` : "—"}</div></div>
          <div><div className="text-muted">This month</div><div className="num mt-0.5 font-semibold">{inr(s.month_paise)}</div></div>
        </div>
        {urgent.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{urgent.map((r) => <Badge key={r.kind} variant={r.tone}>{r.title}</Badge>)}</div>}
      </div>
    </Link>
  );
}

export default function Vehicles() {
  const q = useVehicles();
  const router = useRouter();
  const act = useAct(["vehicles"]);
  const [adding, setAdding] = useState(false);
  const vs = q.data ?? [];
  const month = vs.reduce((a, v) => a + v.stats.month_paise, 0), year = vs.reduce((a, v) => a + v.stats.year_paise, 0);
  const due = vs.flatMap((v) => v.stats.reminders.filter((r) => r.days <= 30));

  const add = (v: VehicleInput) => act(async () => {
    const made = await api<Vehicle>("/vehicles", { method: "POST", body: v });
    router.push(`/vehicles/${made.id}`);
  }, { ok: `${v.name} added`, onDone: () => setAdding(false) });

  return (
    <PageLayout title="Vehicles" icon={Car} error={q.error} description="Your cars and bikes: fuel, mileage, upkeep, papers and trips" action={<Button icon={Plus} onClick={() => setAdding(true)}>Add vehicle</Button>}>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {q.isLoading ? [0, 1, 2, 3].map((i) => <StatSkeleton key={i} />) : <>
          <StatCard label="Vehicles" value={String(vs.length)} />
          <StatCard label="Spent this month" value={inr(month)} />
          <StatCard label="Last 12 months" value={inr(year)} sub="Fuel, upkeep, tolls and trips" />
          <StatCard label="Due in 30 days" value={String(due.length)} tone={due.some((r) => r.tone === "bad") ? "bad" : due.length ? "warn" : "good"} sub={due.length ? due.map((r) => r.kind.toUpperCase()).join(", ") : "Insurance, PUC and service are all clear"} />
        </>}
      </div>

      <div className="mt-6">
        {q.isLoading ? <RowSkeleton /> : vs.length === 0 ? (
          <div className="border border-line py-10">
            <EmptyState icon={Car}>Add your car or bike with its number plate and insurance. Then log fuel and service to see real mileage, cost per km and when the next renewal is due.</EmptyState>
            <div className="mt-4 flex justify-center"><Button icon={Plus} onClick={() => setAdding(true)}>Add your first vehicle</Button></div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{vs.map((v) => <VehicleCard key={v.id} v={v} />)}</div>
        )}
      </div>
      {adding && <VehicleForm onSave={add} onClose={() => setAdding(false)} />}
    </PageLayout>
  );
}
