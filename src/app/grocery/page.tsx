"use client";

import Link from "next/link";
import { Basket } from "@phosphor-icons/react";
import { Badge } from "@/components/atoms";
import { Card, EmptyState, RowSkeleton } from "@/components/molecules";
import { ArrowCta, FoodHabitsCard, GROCERY_SOURCES, GroceryOrderList, RestockCard, SyncProblems, plural, useGrocerySync } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { api, type GrocerySource, useAct, useGroceryMonth, useSwiggyLink } from "@/lib/api";
import { inr } from "@/lib/money";

export default function PantryDashboard() {
  const link = useSwiggyLink(), month = useGroceryMonth(), act = useAct(["grocery"]), sync = useGrocerySync();
  const connected = link.data?.connected ?? false;
  const connect = () => act(async () => { window.location.href = (await api<{ url: string }>("/grocery/swiggy/connect", { method: "POST" })).url; });
  const now = new Date(), data = month.data, orders = data?.orders ?? [];

  return (
    <PageLayout title="Dashboard" icon={Basket} error={link.error ?? month.error}
      description="What you order on Swiggy Instamart and Swiggy Food, and what it cost this month">

      <section className="pantry-sky mb-6 grid gap-4 p-4 sm:p-8 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Card variant="glass" className="flex-1">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-muted">Swiggy MCP_</span>
              {connected && <button className="text-ink hover:underline" onClick={() => act(() => api("/grocery/swiggy", { method: "DELETE" }), { ok: "Swiggy disconnected" })}>Disconnect</button>}
            </div>
            <div className="mt-6 flex items-center justify-between gap-3">
              <h2 className="text-[26px] font-normal leading-none text-ink">{connected ? "Connected" : "Connect"}</h2>
              <Badge variant="outline" className="border-ink/30 text-ink">{connected ? "Live" : "Sign in with OTP"}</Badge>
            </div>
            <ul className="mt-5 space-y-2.5">
              {(Object.keys(GROCERY_SOURCES) as GrocerySource[]).map((s) => {
                const { label, icon: SrcIcon } = GROCERY_SOURCES[s], sp = data?.spend[s];
                return (
                  <li key={s} className="flex items-center gap-3 bg-white/55 py-1.5 pl-1.5 pr-3">
                    <span className="grid size-8 place-items-center bg-white text-ink"><SrcIcon size={15} weight="duotone" /></span>
                    <span className="flex-1 text-[13px] text-ink">{label}</span>
                    <span className="num text-[13px] text-ink">{sp ? `${inr(sp.paise)} · ${sp.count}` : "—"}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-5 flex items-end justify-between gap-4">
              <p className="max-w-[34ch] text-[11px] leading-snug text-sub">
                {connected ? "Orders are saved here. Sync pulls the latest from Swiggy and adds them." : "You sign in on Swiggy with your phone and OTP. We only read your orders; nothing is placed or paid."}
              </p>
              {connected
                ? <ArrowCta loading={sync.pending} onClick={sync.run}>Sync from Swiggy</ArrowCta>
                : <ArrowCta onClick={connect}>Connect Swiggy</ArrowCta>}
            </div>
          </Card>

          <Link href="/grocery/orders" className="block">
            <Card variant="night" interactive>
              <p className="text-[26px] leading-tight sm:text-[30px]">{data ? inr(data.total_paise) : "—"}</p>
              <p className="text-[18px] text-white/50">Spent this month</p>
              <p className="mt-6 text-right text-[13px] text-white/80">{data ? `${plural(orders.length, "order")} · See all` : "Loading"}</p>
            </Card>
          </Link>
        </div>

        <Card variant="outline" padding="sm" className="relative flex min-h-[340px] gap-4 border-white">
          <div className="relative z-10 flex w-[44%] flex-col bg-tint/80 p-4">
            <p className="text-[44px] font-normal leading-none text-ink sm:text-[56px]">{now.toLocaleString("en-IN", { month: "short" })}</p>
            <p className="num text-[44px] font-normal leading-none text-faint sm:text-[56px]">{now.getFullYear()}</p>
            <div className="pantry-haze absolute left-1/3 top-1/3 size-40" aria-hidden />
            <p className="relative mt-auto text-[13px] leading-snug text-sub">
              Instamart {data ? inr(data.spend.instamart.paise) : "—"}<br />Food {data ? inr(data.spend.food.paise) : "—"}<br />Swiggy
            </p>
          </div>
          <div className="pantry-orb absolute right-[8%] top-1/2 size-40 -translate-y-1/2 sm:size-48" aria-hidden />
          <p className="relative z-10 ml-auto p-2 text-right text-[13px] text-sub">Grocery style<br />Pantry tracker</p>
        </Card>
      </section>

      <SyncProblems problems={sync.problems} />

      {connected && (
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <RestockCard />
          <FoodHabitsCard />
        </div>
      )}

      <Card title="Recent orders" icon={Basket} action={orders.length > 5 && <Link href="/grocery/orders" className="text-[13px] text-ink hover:underline">All {orders.length}</Link>}>
        {month.isLoading ? <RowSkeleton /> : orders.length === 0 ? (
          <EmptyState icon={Basket} action={!connected && <ArrowCta onClick={connect}>Connect Swiggy</ArrowCta>}>
            {connected ? "No Swiggy orders saved for this month yet. Use Sync from Swiggy" : "Connect Swiggy to see your Instamart and food orders"}
          </EmptyState>
        ) : <GroceryOrderList orders={orders.slice(0, 5)} />}
      </Card>
    </PageLayout>
  );
}
