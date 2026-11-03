"use client";

import { useState } from "react";
import { Car, CurrencyInr, Drop, Gauge, GasPump, MapPin, Motorcycle, NotePencil, ShieldCheck, Wrench, type Icon } from "@phosphor-icons/react";
import type { FuelType, InsuranceType, LogKind, VehicleInput, VehicleKind, VehicleLog } from "@/lib/api";
import { cn } from "@/lib/cn";
import { rupeesToPaise } from "@/lib/money";
import { Button, Input, Select } from "../atoms";
import { DatePicker, FormField, Modal, SectionTitle, Tabs } from "../molecules";

export const FUELS: { value: FuelType; label: string }[] = [{ value: "petrol", label: "Petrol" }, { value: "diesel", label: "Diesel" }, { value: "cng", label: "CNG" }, { value: "electric", label: "Electric" }];
export const LOG_KINDS: { value: LogKind; label: string; icon: Icon }[] = [
  { value: "fuel", label: "Fuel", icon: GasPump }, { value: "service", label: "Service", icon: Wrench }, { value: "repair", label: "Repair", icon: Wrench },
  { value: "parts", label: "Parts & tyres", icon: Wrench }, { value: "wash", label: "Wash", icon: Drop }, { value: "toll", label: "Toll / FASTag", icon: MapPin },
  { value: "parking", label: "Parking", icon: MapPin }, { value: "fine", label: "Fine / challan", icon: NotePencil }, { value: "trip", label: "Trip", icon: MapPin }, { value: "other", label: "Other", icon: NotePencil },
];
export const INSURANCE_TYPES: { value: InsuranceType; label: string; hint: string }[] = [
  { value: "comprehensive", label: "Comprehensive", hint: "Your own damage and third party" },
  { value: "third_party", label: "Third party only", hint: "The legal minimum; your own damage is not covered" },
  { value: "own_damage", label: "Own damage only (first party)", hint: "Keep a valid third-party policy alongside it" },
];
export const insuranceLabel = (t?: string) => INSURANCE_TYPES.find((x) => x.value === t)?.label;
export const logLabel =(k: string) => LOG_KINDS.find((x) => x.value === k)?.label ?? k;
export const vehicleIcon = (k: VehicleKind) => (k === "bike" ? Motorcycle : Car);

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const str = (n?: number) => (n ? String(n) : "");
const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
const rupees = (p?: number) => (p ? String(p / 100) : "");

/** Add or edit a car or bike: identity, insurance, PUC and the service interval. */
export function VehicleForm({ initial, onSave, onClose }: { initial?: VehicleInput; onSave: (v: VehicleInput) => void; onClose: () => void }) {
  const i = initial;
  const [kind, setKind] = useState<VehicleKind>(i?.kind ?? "car");
  const [d, setD] = useState({
    name: i?.name ?? "", plate: i?.plate ?? "", make: i?.make ?? "", model: i?.model ?? "", year: str(i?.year), fuel: i?.fuel ?? "petrol",
    tank: str(i?.tank_litres), claimed: str(i?.claimed_kmpl), odo: str(i?.odometer_km), puc: i?.puc_expires ?? "",
    svcKm: str(i?.service_km), svcMonths: str(i?.service_months), bought: i?.bought_on ?? "", planned: i?.service_planned ?? "",
    insType: i?.insurance.type ?? "comprehensive", insurer: i?.insurance.insurer ?? "", policy: i?.insurance.policy_no ?? "", expires: i?.insurance.expires ?? "", premium: rupees(i?.insurance.premium_paise), idv: rupees(i?.insurance.idv_paise),
  });
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });
  const premium = d.premium ? rupeesToPaise(d.premium) : 0, idv = d.idv ? rupeesToPaise(d.idv) : 0;
  const ok = d.name.trim() !== "" && d.plate.trim() !== "" && premium !== null && idv !== null;
  const electric = d.fuel === "electric";

  const submit = () => onSave({
    kind, name: d.name.trim(), plate: d.plate, make: d.make, model: d.model, year: num(d.year), fuel: d.fuel as FuelType,
    tank_litres: num(d.tank), claimed_kmpl: num(d.claimed), odometer_km: num(d.odo), puc_expires: d.puc || undefined,
    service_km: num(d.svcKm), service_months: num(d.svcMonths), bought_on: d.bought || undefined, service_planned: d.planned || undefined,
    insurance: { type: d.insType as InsuranceType, insurer: d.insurer, policy_no: d.policy, expires: d.expires || undefined, premium_paise: premium || undefined, idv_paise: idv || undefined },
  });

  return (
    <Modal wide title={i ? `Edit ${i.name}` : "Add a vehicle"} subtitle="Papers, renewals and service in one place" icon={vehicleIcon(kind)} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); if (ok) submit(); }} className="space-y-6">
        <div className="space-y-4">
          <Tabs value={kind} onChange={setKind} items={[{ value: "car", label: "Car" }, { value: "bike", label: "Bike" }]} />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Name"><Input value={d.name} onChange={set("name")} placeholder={kind === "bike" ? "The Classic" : "Family car"} autoFocus /></FormField>
            <FormField label="Number plate"><Input value={d.plate} onChange={set("plate")} placeholder="KL 07 AB 1234" className="uppercase" /></FormField>
            <FormField label="Make" hint="Optional"><Input value={d.make} onChange={set("make")} placeholder={kind === "bike" ? "Royal Enfield" : "Honda"} /></FormField>
            <FormField label="Model" hint="Optional"><Input value={d.model} onChange={set("model")} placeholder={kind === "bike" ? "Classic 350" : "City"} /></FormField>
            <FormField label="Year" hint="Optional"><Input type="number" min={1950} max={2100} value={d.year} onChange={set("year")} /></FormField>
            <FormField label="Fuel"><Select value={d.fuel} onChange={set("fuel")}>{FUELS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</Select></FormField>
            <FormField label={electric ? "Battery (kWh)" : "Tank (litres)"} hint="For the range on a full tank"><Input type="number" min={0} step="any" value={d.tank} onChange={set("tank")} /></FormField>
            <FormField label={electric ? "Claimed km per kWh" : "Claimed mileage (km/l)"} hint="The maker's figure, to compare with yours"><Input type="number" min={0} step="any" value={d.claimed} onChange={set("claimed")} /></FormField>
            <FormField label="Odometer now (km)" icon={Gauge} className="col-span-2" hint="Fuel entries with readings keep this up to date"><Input type="number" min={0} value={d.odo} onChange={set("odo")} /></FormField>
          </div>
        </div>

        <div>
          <SectionTitle icon={ShieldCheck}>Insurance</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Cover" className="col-span-2" hint={INSURANCE_TYPES.find((t) => t.value === d.insType)?.hint}>
              <Select value={d.insType} onChange={set("insType")}>{INSURANCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select>
            </FormField>
            <FormField label="Insurer"><Input value={d.insurer} onChange={set("insurer")} placeholder="ICICI Lombard" /></FormField>
            <FormField label="Policy number"><Input value={d.policy} onChange={set("policy")} /></FormField>
            <FormField label="Expires on" hint="You get reminders 30, 7 and 1 day before"><DatePicker value={d.expires} onChange={(expires) => setD({ ...d, expires })} /></FormField>
            <FormField label="Premium (₹)" icon={CurrencyInr} error={premium === null ? "Not a valid amount" : undefined}><Input type="number" min={0} step="any" value={d.premium} onChange={set("premium")} /></FormField>
            <FormField label="IDV (₹)" hint={d.insType === "third_party" ? "Not part of a third-party policy" : "Insured declared value"} error={idv === null ? "Not a valid amount" : undefined}><Input type="number" min={0} step="any" value={d.idv} onChange={set("idv")} /></FormField>
            <FormField label="PUC valid till" hint={electric ? "Not needed for an electric" : "Pollution certificate"}><DatePicker value={d.puc} onChange={(puc) => setD({ ...d, puc })} /></FormField>
          </div>
        </div>

        <div>
          <SectionTitle icon={Wrench}>Service</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Every (km)" hint={kind === "bike" ? "Bikes: often 3,000 to 5,000" : "Cars: often 10,000"}><Input type="number" min={0} value={d.svcKm} onChange={set("svcKm")} /></FormField>
            <FormField label="Or every (months)" hint="Whichever comes first"><Input type="number" min={0} max={60} value={d.svcMonths} onChange={set("svcMonths")} /></FormField>
            <FormField label="Bought on" hint="The maker's schedule counts from here until you log a service"><DatePicker value={d.bought} onChange={(bought) => setD({ ...d, bought })} /></FormField>
            <FormField label="Next service booked for" hint="Optional: overrides the suggested date"><DatePicker value={d.planned} onChange={(planned) => setD({ ...d, planned })} /></FormField>
          </div>
        </div>

        <div className="border-t border-line pt-4"><Button type="submit" disabled={!ok} className={cn(!ok && "opacity-50")}>{i ? "Save changes" : "Add vehicle"}</Button></div>
      </form>
    </Modal>
  );
}

export type LogDraft = Partial<VehicleLog> & { kind: LogKind };

/** One entry in a vehicle's log: fuel (with litres for mileage), upkeep, or a trip. */
export function LogForm({ initial, electric, editing, onSave, onClose }: { initial: LogDraft; electric?: boolean; editing?: boolean; onSave: (l: Omit<VehicleLog, "id">) => void; onClose: () => void }) {
  const [d, setD] = useState({
    kind: initial.kind, date: initial.date ?? today(), amount: rupees(initial.amount_paise), odo: str(initial.odometer_km), litres: str(initial.litres),
    full: initial.full_tank ?? true, place: initial.place ?? "", from: initial.from ?? "", km: str(initial.trip_km), note: initial.note ?? "",
  });
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setD({ ...d, [k]: e.target.value });
  const fuel = d.kind === "fuel", trip = d.kind === "trip";
  const paise = d.amount.trim() === "" && trip ? 0 : rupeesToPaise(d.amount);
  const litres = Number(d.litres);
  const ok = d.date !== "" && paise !== null && (trip ? d.place.trim() !== "" : paise > 0) && (!fuel || litres > 0);
  const unit = electric ? "kWh" : "litres";

  return (
    <Modal title={editing ? "Edit entry" : trip ? "Log a trip" : "Add an entry"} subtitle={trip ? "Where you went, so you remember it" : "Fuel, upkeep and running costs"} icon={trip ? MapPin : fuel ? GasPump : Wrench} onClose={onClose}>
      <form onSubmit={(e) => {
        e.preventDefault();
        if (ok) onSave({ kind: d.kind, date: d.date, amount_paise: paise!, odometer_km: num(d.odo), litres: fuel ? litres : undefined, full_tank: fuel ? d.full : undefined,
          place: d.place.trim() || undefined, from: trip ? d.from.trim() || undefined : undefined, trip_km: trip ? num(d.km) : undefined, note: d.note.trim() || undefined, txn_id: initial.txn_id });
      }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="What"><Select value={d.kind} onChange={set("kind")}>{LOG_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</Select></FormField>
          <FormField label="Date"><DatePicker value={d.date} onChange={(date) => setD({ ...d, date })} /></FormField>
          {trip ? <>
            <FormField label="From"><Input value={d.from} onChange={set("from")} placeholder="Kochi" /></FormField>
            <FormField label="To" icon={MapPin}><Input value={d.place} onChange={set("place")} placeholder="Munnar" autoFocus /></FormField>
            <FormField label="Distance (km)"><Input type="number" min={0} value={d.km} onChange={set("km")} /></FormField>
            <FormField label="Spent on the trip (₹)" hint="Optional: food, stay, tolls" error={paise === null ? "Not a valid amount" : undefined}><Input type="number" min={0} step="any" value={d.amount} onChange={set("amount")} /></FormField>
          </> : <>
            <FormField label="Amount (₹)" icon={CurrencyInr} error={paise === null && d.amount ? "Not a valid amount" : undefined}><Input type="number" min={0} step="any" value={d.amount} onChange={set("amount")} autoFocus={!initial.amount_paise} /></FormField>
            <FormField label="Odometer (km)" icon={Gauge} hint={fuel ? "Needed for mileage" : "Optional"}><Input type="number" min={0} value={d.odo} onChange={set("odo")} /></FormField>
            {fuel && <>
              <FormField label={`Fuel (${unit})`} hint={litres > 0 && paise ? `₹${(paise / 100 / litres).toFixed(2)} per ${electric ? "kWh" : "litre"}` : undefined}><Input type="number" min={0} step="any" value={d.litres} onChange={set("litres")} /></FormField>
              <label className="flex items-center gap-2 self-end pb-2.5 text-[13px]"><input type="checkbox" checked={d.full} onChange={(e) => setD({ ...d, full: e.target.checked })} />{electric ? "Charged to full" : "Filled the tank to full"}</label>
            </>}
            <FormField label={fuel ? "Pump" : "Where"} className="col-span-2"><Input value={d.place} onChange={set("place")} placeholder={fuel ? "HP, MG Road" : "Authorised service centre"} /></FormField>
          </>}
          <FormField label="Note" className="col-span-2" hint="Optional"><Input value={d.note} onChange={set("note")} placeholder={trip ? "Tea gardens, stayed two nights" : fuel ? "" : "Oil change, brake pads"} /></FormField>
        </div>
        {fuel && <p className="text-[12px] text-muted">Mileage is measured between two full {electric ? "charges" : "tanks"}, so tick the box when you fill up completely and add the odometer reading.</p>}
        <div className="border-t border-line pt-4"><Button type="submit" disabled={!ok} className={cn(!ok && "opacity-50")}>{editing ? "Save changes" : "Add entry"}</Button></div>
      </form>
    </Modal>
  );
}
