"use client";

import { useState } from "react";
import type { StockInput } from "@/lib/api";
import { Button, Input } from "../atoms";
import { FormField, Modal } from "../molecules";

const today = () => new Date().toISOString().slice(0, 10);

/** Add or edit one purchase (a lot). Symbols need Yahoo's exchange suffix: .NS for NSE, .BO for BSE. */
export function StockForm({ initial, symbol, onSave, onClose }: { initial?: StockInput; symbol?: string; onSave: (s: StockInput) => void; onClose: () => void }) {
  const [d, setD] = useState({ symbol: initial?.symbol ?? symbol ?? "", quantity: String(initial?.quantity ?? ""), buyPrice: String(initial?.buyPrice ?? ""), buyDate: initial?.buyDate ?? today() });
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement>) => setD({ ...d, [k]: e.target.value });
  const quantity = Number(d.quantity), buyPrice = Number(d.buyPrice);
  const sym = d.symbol.trim().toUpperCase();
  const ok = /^[A-Z0-9&^-]{1,20}\.(NS|BO)$/.test(sym) && quantity > 0 && buyPrice > 0 && !!d.buyDate;

  return (
    <Modal title={initial ? "Edit purchase" : "Add purchase"} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); if (ok) onSave({ symbol: sym, quantity, buyPrice, buyDate: d.buyDate }); }} className="space-y-4">
        <FormField label="Symbol" hint="NSE: RELIANCE.NS · BSE: RELIANCE.BO"><Input value={d.symbol} onChange={set("symbol")} placeholder="RELIANCE.NS" autoFocus={!initial && !symbol} /></FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Quantity"><Input type="number" min={0} step="any" value={d.quantity} onChange={set("quantity")} /></FormField>
          <FormField label="Buy price (₹)"><Input type="number" min={0} step="any" value={d.buyPrice} onChange={set("buyPrice")} /></FormField>
          <FormField label="Buy date" className="col-span-2"><Input type="date" max={today()} value={d.buyDate} onChange={set("buyDate")} /></FormField>
        </div>
        <Button type="submit" disabled={!ok}>{initial ? "Save changes" : "Add purchase"}</Button>
      </form>
    </Modal>
  );
}
