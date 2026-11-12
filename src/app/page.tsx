import Link from "next/link";
import { ArrowRight, Basket, House, UserCircle } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

const SPACES: { href?: string; title: string; text: string; icon: Icon }[] = [
  { href: "/personal-finance", title: "Personal Finance", text: "Accounts, cards, investments and everyday spending.", icon: UserCircle },
  { href: "/household", title: "Household Finance", text: "Shared expenses, budgets, EMIs and household assets.", icon: House },
  { href: "/grocery", title: "Grocery & Pantry Tracker", text: "Grocery orders, pantry activity and monthly spending.", icon: Basket },
];

export default function SelectSpace() {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-6 py-12">
      <div className="w-full max-w-[960px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/catalyst-full.svg" alt="Catalyst" className="h-9 w-auto" />
        <h1 className="mt-6 text-[22px] font-semibold tracking-tight">Choose your space</h1>
        <p className="mt-1 text-[14px] text-muted">Everything you manage, organised in one place.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {SPACES.map(({ href, title, text, icon: Icon }) => {
            const body = (
              <>
                <span className="grid size-10 place-items-center border border-line bg-tint text-ink"><Icon size={20} weight="regular" aria-hidden /></span>
                <h2 className="mt-4 text-[17px] font-medium">{title}</h2>
                <p className="mt-1 text-[13px] text-muted">{text}</p>
                {href
                  ? <ArrowRight size={16} aria-hidden className="absolute right-5 top-6 text-faint transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink" />
                  : <span className="eyebrow mt-4 inline-block border border-line px-2 py-0.5">Beta · coming soon</span>}
              </>
            );
            return href ? (
              <Link key={title} href={href} className="group relative block min-h-[168px] cursor-pointer border border-line bg-surface p-5 transition-colors duration-150 hover:border-ink/40 hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink active:bg-hover">{body}</Link>
            ) : (
              <div key={title} aria-disabled className="min-h-[168px] cursor-not-allowed border border-line bg-surface p-5 opacity-50">{body}</div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
