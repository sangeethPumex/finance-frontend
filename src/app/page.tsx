import Link from "next/link";
import { Basket, House, UserCircle } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

const SPACES: { href?: string; title: string; text: string; icon: Icon }[] = [
  { href: "/personal-finance", title: "Personal Finance", text: "Your accounts, cards, investments and spending.", icon: UserCircle },
  { href: "/household", title: "Household Finance", text: "Shared bills, budgets, EMIs and the garage.", icon: House },
  { title: "Grocery & Pantry Tracker", text: "Stock, shopping lists and what is running low.", icon: Basket },
];

export default function SelectSpace() {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-6 py-12">
      <div className="w-full max-w-[960px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/catalyst-full.svg" alt="Catalyst" className="h-9 w-auto" />
        <h1 className="mt-6 text-[22px] font-semibold tracking-tight">Where to today?</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {SPACES.map(({ href, title, text, icon: Icon }) => {
            const body = (
              <>
                <Icon size={28} weight="light" />
                <h2 className="mt-8 text-[16px] font-semibold">{title}</h2>
                <p className="mt-1 text-[13px] text-muted">{text}</p>
                {!href && <span className="eyebrow mt-4 inline-block border border-line px-2 py-0.5">Beta · coming soon</span>}
              </>
            );
            return href ? (
              <Link key={title} href={href} className="block border border-line bg-surface p-6 transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,.08)]">{body}</Link>
            ) : (
              <div key={title} aria-disabled className="cursor-not-allowed border border-line bg-surface p-6 opacity-50">{body}</div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
