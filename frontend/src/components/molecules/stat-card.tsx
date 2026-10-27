import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { Eyebrow } from "../atoms";
import { Card } from "./card";
import { toneChip, toneSoft, toneText } from "./charts";

/** A headline number. Pass href to make the whole card a link; tone colours the value and tints the card. */
export function StatCard({ label, value, icon: Icon, href, tone = "neutral", sub, children }: { label: string; value: string; icon?: Icon; href?: string; tone?: keyof typeof toneText; sub?: string; children?: React.ReactNode }) {
  const card = (
    <Card interactive={!!href} className={cn("h-full", toneSoft[tone])}>
      <div className="flex items-center justify-between gap-2">
        <Eyebrow>{label}</Eyebrow>
        {Icon && <span className={cn("grid size-8 place-items-center rounded-md", toneChip[tone])}><Icon size={17} weight="duotone" /></span>}
      </div>
      <div className={cn("num mt-3 text-[26px] font-semibold leading-none tracking-tight", tone === "info" ? "text-ink" : toneText[tone])}>{value}</div>
      {sub && <div className="mt-2 text-[12px] leading-snug text-muted">{sub}</div>}
      {children && <div className="mt-3">{children}</div>}
    </Card>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}
