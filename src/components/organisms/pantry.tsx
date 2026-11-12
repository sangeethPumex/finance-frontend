"use client";

import { useState } from "react";
import { Basket, CaretRight, CheckCircle, ForkKnife, Package, Receipt, Wallet, type Icon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Badge, Button } from "../atoms";
import { Modal, RowList, SectionTitle } from "../molecules";
import { api, type GroceryOrder, type GrocerySource, useWrite } from "@/lib/api";
import { shortDateTime } from "@/lib/dates";
import { inr } from "@/lib/money";

export const GROCERY_SOURCES: Record<GrocerySource, { label: string; icon: Icon }> = {
  instamart: { label: "Instamart", icon: Basket },
  food: { label: "Swiggy Food", icon: ForkKnife },
};

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The pantry board's black call-to-action: a label with a caret square joined on. Square corners, like the rest of the app. */
export function ArrowCta({ children, ...p }: React.ComponentProps<typeof Button>) {
  return (
    <Button {...p} className="gap-0 pr-0">
      {children}
      <span aria-hidden className="ml-3 grid h-full aspect-square place-items-center border-l border-white/20"><CaretRight size={13} weight="bold" /></span>
    </Button>
  );
}

/**
 * The manual sync: asks the backend to pull Swiggy and store what it finds, then the stored orders are read back from the backend.
 * Nothing else calls Swiggy. problems names a source that failed while the other still synced.
 */
export function useGrocerySync() {
  const [problems, setProblems] = useState<Record<string, string>>({});
  // After the orders are stored, recount the habits and the restock list from them (best effort: the sync itself already succeeded).
  const w = useWrite(() => api<{ synced: number; errors?: Record<string, string> }>("/grocery/orders/sync", { method: "POST" }).then(async (r) => {
    setProblems(r.errors ?? {});
    await Promise.allSettled([api("/grocery/habits/refresh", { method: "POST" }), api("/grocery/basket/refresh", { method: "POST" })]);
    return r.synced;
  }), ["grocery"]);
  const run = () => w.mutate(undefined, {
    onSuccess: (n) => toast.success(`Synced ${plural(n as number, "order")} from Swiggy`),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not sync"),
  });
  return { run, pending: w.isPending, problems };
}

export function SyncProblems({ problems }: { problems: Record<string, string> }) {
  const rows = Object.entries(problems);
  if (rows.length === 0) return null;
  return (
    <div className="mb-4 space-y-1 border border-warn bg-warn-bg px-5 py-3 text-[13px] text-warn" role="status">
      {rows.map(([s, msg]) => <p key={s}>{GROCERY_SOURCES[s as GrocerySource]?.label ?? s}: {msg}</p>)}
    </div>
  );
}

const off = (o: GroceryOrder) => /cancel/i.test(o.status);
const statusText = (o: GroceryOrder) => o.status.toLowerCase().replace(/_/g, " ");
const PAYMENT: Record<string, string> = { UPIIntent: "UPI" };

/** Swiggy orders, newest first: a quiet row each (store, when, amount, status). A click opens the order. Cancelled ones are struck through: they are not counted as spend. */
export function GroceryOrderList({ orders }: { orders: GroceryOrder[] }) {
  const [open, setOpen] = useState<GroceryOrder>();
  return (
    <>
      <RowList>
        {orders.map((o) => {
          const SrcIcon = GROCERY_SOURCES[o.source].icon;
          return (
            <li key={o.source + o.order_id}>
              <button type="button" onClick={() => setOpen(o)} className="-mx-3 flex w-[calc(100%+1.5rem)] items-center gap-4 px-3 py-3.5 text-left transition-colors hover:bg-hover">
                <span className="grid size-10 shrink-0 place-items-center bg-tint text-ink"><SrcIcon size={18} weight="duotone" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{o.store || GROCERY_SOURCES[o.source].label}</span>
                  <span className="block truncate text-[12px] text-muted">{shortDateTime(o.placed_at)}{o.item_count > 0 && ` · ${plural(o.item_count, "item")}`}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className={`num block text-[14px] ${off(o) ? "text-muted line-through" : "font-medium text-ink"}`}>{inr(o.total_paise)}</span>
                  <span className={`block text-[11px] capitalize ${off(o) ? "text-loss" : "text-muted"}`}>{statusText(o)}</span>
                </span>
                <CaretRight size={14} className="shrink-0 text-faint" aria-hidden />
              </button>
            </li>
          );
        })}
      </RowList>
      {open && <GroceryOrderDialog order={open} onClose={() => setOpen(undefined)} />}
    </>
  );
}

function Line({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-1.5 text-[13px] ${strong ? "mt-1 border-t border-line pt-2.5 font-semibold text-ink" : ""}`}>
      <dt className={strong ? "" : "text-muted"}>{label}</dt>
      <dd className="num text-right text-ink">{value}</dd>
    </div>
  );
}

/** One order in full: what was in it, the bill, how it was paid. */
export function GroceryOrderDialog({ order: o, onClose }: { order: GroceryOrder; onClose: () => void }) {
  const src = GROCERY_SOURCES[o.source], b = o.bill;
  // Swiggy lists no discount line, so it is what the parts add up to beyond what was paid. A negative gap is an unlisted charge; either way the bill reconciles to the total.
  const gap = b ? b.item_paise + b.delivery_paise + b.packaging_paise - o.total_paise : 0;
  const delivered = /deliver/i.test(o.status);
  return (
    <Modal title={o.store || src.label} subtitle={`${src.label} · ${shortDateTime(o.placed_at)}`} icon={src.icon} onClose={onClose}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{off(o) ? "Total" : "Total paid"}</p>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <p className={`num text-[30px] font-semibold leading-none ${off(o) ? "text-muted line-through" : "text-ink"}`}>{inr(o.total_paise)}</p>
        <Badge variant={off(o) ? "bad" : delivered ? "good" : "neutral"} className="gap-1 capitalize">{delivered && <Package size={13} weight="bold" aria-hidden />}{statusText(o)}</Badge>
      </div>

      <div className="mt-6 border-t border-line-soft pt-5">
        <SectionTitle icon={Basket}>{o.items?.length ? `Items · ${o.items.length}` : "Items"}</SectionTitle>
        {o.items?.length ? (
          <ul className="divide-y divide-line-soft border-y border-line-soft">
            {o.items.map((it, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5 text-[13px]">
                {/* Swiggy sends no product images, so one neutral tile stands in for all. */}
                <span className="grid size-9 shrink-0 place-items-center bg-tint text-muted"><Basket size={16} aria-hidden /></span>
                <span className="min-w-0 flex-1 break-words text-ink">{it.name}</span>
                <span className="num shrink-0 text-muted">×{it.qty}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-[13px] text-sub">{o.summary || "Swiggy did not send the items for this order."}</p>}
      </div>

      {b && (
        <div className="mt-6">
          <SectionTitle icon={Receipt}>Bill summary</SectionTitle>
          <dl className="bg-tint px-4 py-2">
            <Line label="Item subtotal" value={inr(b.item_paise)} />
            <Line label="Delivery fee" value={b.delivery_paise ? inr(b.delivery_paise) : "Free"} />
            <Line label="Packaging fee" value={b.packaging_paise ? inr(b.packaging_paise) : "Free"} />
            {gap > 0 && <Line label="Discounts & offers" value={<span className="text-gain">−{inr(gap)}</span>} />}
            {gap < 0 && <Line label="Other charges" value={inr(-gap)} />}
            <Line strong label={off(o) ? "Total" : "Total paid"} value={inr(o.total_paise)} />
          </dl>
        </div>
      )}

      <div className="mt-6">
        <SectionTitle icon={Wallet}>Payment details</SectionTitle>
        <dl className="text-[13px]">
          {o.payment && <Line label="Method" value={PAYMENT[o.payment] ?? o.payment} />}
          {delivered && <Line label="Status" value={<span className="inline-flex items-center gap-1 text-gain"><CheckCircle size={14} weight="bold" aria-hidden />Paid</span>} />}
          <Line label="Order ID" value={<span className="font-mono text-[11px] text-muted">{o.order_id}</span>} />
        </dl>
      </div>
    </Modal>
  );
}
