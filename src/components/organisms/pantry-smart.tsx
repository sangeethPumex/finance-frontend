"use client";

import { useState } from "react";
import { Basket, Lightning, Repeat } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Card, EmptyState } from "../molecules";
import { ArrowCta, plural } from "./pantry";
import { useAddBasket, useBasket, useFoodHabits } from "@/lib/api";
import { inr } from "@/lib/money";

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" });

/** Repeat Food orders: what they are, what they cost a month, and when the next one is likely. The copilot nudges shortly before. */
export function FoodHabitsCard() {
  const q = useFoodHabits();
  const rows = q.data ?? [];
  return (
    <Card title="Food habits" icon={Repeat}>
      {rows.length === 0 ? (
        <EmptyState icon={Repeat}>{q.isLoading ? "Loading" : "No repeat orders yet. A habit shows once the same dish has come three times at about the same hour."}</EmptyState>
      ) : (
        <ul className="divide-y divide-line-soft">
          {rows.map((h) => (
            <li key={h.key} className="py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium text-ink">{h.name}</p>
                <p className="num shrink-0 text-[14px] font-medium text-ink">{inr(h.monthly_paise)}<span className="text-[11px] font-normal text-muted"> a month</span></p>
              </div>
              <p className="mt-0.5 text-[12px] text-muted">{h.line}</p>
              <p className="mt-1 text-[12px] text-sub">{h.next_at && `Next likely ${when(h.next_at)} · `}{h.dish}{h.restaurant && ` at ${h.restaurant}`}</p>
              {h.alt && <p className="mt-1 text-[12px] text-gain">Cheaper: {h.alt}</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** The weekly restock: what is probably running low, its price, and whether it clears the free-delivery bar. One tap puts it in the Swiggy cart; checkout stays in the Swiggy app. */
export function RestockCard() {
  const q = useBasket(), add = useAddBasket(), [tip, setTip] = useState(false);
  const b = q.data;
  const lines = b?.lines ?? [];
  const total = (b?.total_paise ?? 0) + (tip && b?.tipper ? b.tipper.qty * b.tipper.price_paise : 0);
  const free = !!b && b.threshold_paise > 0 && total >= b.threshold_paise;
  const run = () => add.mutate(tip, {
    onSuccess: (r) => {
      const res = r as { added: number; in_cart: number; cart_total: string; warnings?: string[] };
      toast.success(res.added ? `${plural(res.added, "item")} added to your Swiggy cart` : "Everything is already in your Swiggy cart");
      res.warnings?.forEach((w) => toast.warning(w));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update the cart"),
  });
  return (
    <Card title="Your basket is ready" icon={Basket}>
      {!b || lines.length === 0 ? (
        <EmptyState icon={Basket}>{q.isLoading ? "Loading" : "Nothing looks like it is running low. Items show once you have bought them twice and their usual gap has nearly passed."}</EmptyState>
      ) : (
        <>
          {b.fee_orders > 0 && <p className="mb-3 text-[12px] text-muted">{inr(b.fees_paise)} in delivery and packaging fees across {plural(b.fee_orders, "order")} in the last 30 days.</p>}
          <ul className="divide-y divide-line-soft border-y border-line-soft">
            {lines.map((l) => (
              <li key={l.key} className="flex items-center gap-3 py-2.5 text-[13px]">
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-ink">{l.name}</span>
                  <span className="block text-[11px] text-muted">{[l.variant, `last bought ${l.days_since} days ago`].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="num shrink-0 text-muted">×{l.qty}</span>
                <span className="num w-16 shrink-0 text-right text-ink">{inr(l.qty * l.price_paise)}</span>
              </li>
            ))}
          </ul>
          {b.tipper && (tip || !free) && (
            <label className="mt-3 flex items-start gap-2 text-[12px] text-sub">
              <input type="checkbox" className="mt-0.5" checked={tip} onChange={(e) => setTip(e.target.checked)} />
              <span>Add {b.tipper.name} ({inr(b.tipper.price_paise)}) to reach free delivery. It is something you buy regularly.</span>
            </label>
          )}
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <p className="num text-[22px] font-semibold leading-none text-ink">{inr(total)}</p>
              <p className={`mt-1 flex items-center gap-1 text-[12px] ${free ? "text-gain" : "text-muted"}`}>
                {free ? <><Lightning size={12} weight="fill" aria-hidden />₹0 delivery fee</> : b.threshold_paise > 0 ? `${inr(b.threshold_paise - total)} more for free delivery, going by your past orders` : "Delivery fee may apply"}
              </p>
            </div>
            <ArrowCta loading={add.isPending} onClick={run}>Add to Swiggy cart</ArrowCta>
          </div>
          {b.no_sku > 0 && <p className="mt-3 text-[11px] text-faint">{plural(b.no_sku, "item")} running low could not be matched to Swiggy and was left out.</p>}
        </>
      )}
    </Card>
  );
}
