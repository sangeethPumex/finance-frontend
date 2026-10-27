"use client";

import { useState } from "react";
import { CalendarBlank, ChartLineUp, CurrencyInr, Hash, Storefront, Tag } from "@phosphor-icons/react";
import type { StockInput } from "@/lib/api";
import { Button, Input } from "../atoms";
import { FormField, Modal } from "../molecules";

const PLATFORMS = ["Groww", "Motilal Oswal", "Geojit"];
const today = () => new Date().toISOString().slice(0, 10);

/** Add or edit one purchase (a lot). Symbols need Yahoo's exchange suffix: .NS for NSE, .BO for BSE. */
export function StockForm({ initial, symbol, onSave, onClose }: { initial?: StockInput; symbol?: string; onSave: (s: StockInput) => void; onClose: () => void }) {
  const [d, setD] = useState({ symbol: initial?.symbol ?? symbol ?? "", quantity: String(initial?.quantity ?? ""), buyPrice: String(initial?.buyPrice ?? ""), buyDate: initial?.buyDate ?? today(), platform: initial?.platform ?? "" });
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement>) => setD({ ...d, [k]: e.target.value });
  const quantity = Number(d.quantity), buyPrice = Number(d.buyPrice);
  const sym = d.symbol.trim().toUpperCase();
  const ok = /^[A-Z0-9&^-]{1,20}\.(NS|BO)$/.test(sym) && quantity > 0 && buyPrice > 0 && !!d.buyDate;

  return (
    <Modal title={initial ? "Edit purchase" : "Add purchase"} subtitle={initial?.symbol ?? symbol ?? "Record a buy: symbol, quantity, price, date"} icon={ChartLineUp} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); if (ok) onSave({ symbol: sym, quantity, buyPrice, buyDate: d.buyDate, platform: d.platform.trim() }); }} className="space-y-4">
        <FormField label="Symbol" icon={Tag} hint="NSE: RELIANCE.NS · BSE: RELIANCE.BO"><Input value={d.symbol} onChange={set("symbol")} placeholder="RELIANCE.NS" autoFocus={!initial && !symbol} /></FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Quantity" icon={Hash}><Input type="number" min={0} step="any" value={d.quantity} onChange={set("quantity")} /></FormField>
          <FormField label="Buy price (₹)" icon={CurrencyInr}><Input type="number" min={0} step="any" value={d.buyPrice} onChange={set("buyPrice")} /></FormField>
          <FormField label="Buy date" icon={CalendarBlank}><Input type="date" max={today()} value={d.buyDate} onChange={set("buyDate")} /></FormField>
          <FormField label="Platform" icon={Storefront} hint="Optional"><Input list="stock-platforms" maxLength={40} value={d.platform} onChange={set("platform")} placeholder="Groww" /></FormField>
          <datalist id="stock-platforms">{PLATFORMS.map((p) => <option key={p} value={p} />)}</datalist>
        </div>
        <div className="border-t border-line pt-4"><Button type="submit" disabled={!ok}>{initial ? "Save changes" : "Add purchase"}</Button></div>
      </form>
    </Modal>
  );
}
