import { HandCoins } from "@phosphor-icons/react";
import type { Card, CardNetwork } from "@/lib/api";
import { bankName } from "@/lib/banks";
import { cn } from "@/lib/cn";

/** Bank identity: a two-stop gradient from the bank's own colours. Banks are free text from SMS, so match on a keyword. */
const BANKS: [keyword: string, from: string, to: string][] = [
  ["hdfc", "#0b3a73", "#0a1f3d"], ["kotak", "#c8102e", "#6e0a19"], ["federal", "#12407c", "#0a2142"], ["union", "#1d4f9c", "#0c2a56"],
  ["axis", "#97144d", "#4d0a28"], ["icici", "#c2551a", "#6b2a0c"], ["sbi", "#1c4e9d", "#0d2a58"], ["amex", "#4a5560", "#252b31"], ["american", "#4a5560", "#252b31"],
];
/** Cards with no known bank get a deterministic colour from their name, so each looks its own. */
const FALLBACK: [string, string][] = [["#2b2b2a", "#121211"], ["#1f5f46", "#0e2f23"], ["#3b3f8f", "#1c1e48"], ["#6b2f5c", "#34162d"], ["#0f5c63", "#07303a"]];

function palette(c: Card): [string, string] {
  const b = `${c.bank ?? ""} ${c.name}`.toLowerCase();
  const hit = BANKS.find(([k]) => b.includes(k));
  if (hit) return [hit[1], hit[2]];
  let h = 0;
  for (const ch of c.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK[h % FALLBACK.length];
}

const NETWORK_LABEL: Record<CardNetwork, string> = { visa: "VISA", mastercard: "", rupay: "RuPay", amex: "AMEX", diners: "Diners" };

function Network({ n }: { n?: CardNetwork }) {
  if (!n) return null;
  if (n === "mastercard") {
    return <span className="relative block h-6 w-10" aria-label="Mastercard"><span className="absolute left-0 top-0 size-6 rounded-full bg-[#eb001b]" /><span className="absolute right-0 top-0 size-6 rounded-full bg-[#f79e1b] mix-blend-screen" /></span>;
  }
  return <span className={cn("text-[16px] font-bold leading-none tracking-wide", n === "visa" && "text-[19px] italic")}>{NETWORK_LABEL[n]}</span>;
}

/** The card as a physical object: bank colours, the network, last four digits and the name. Money stays outside it, in the tile. */
export function CardFace({ card: c, className, height = 112 }: { card: Card; className?: string; height?: number }) {
  const [from, to] = palette(c);
  const paylater = c.kind === "paylater";
  return (
    <div className={cn("relative w-full overflow-hidden rounded-[10px] px-4 py-3.5 text-white shadow-[0_10px_24px_-10px_rgba(0,0,0,.45),0_2px_4px_rgba(0,0,0,.12)]", className)}
      style={{ height, background: `linear-gradient(135deg, ${from}, ${to})` }}>
      <span className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-white/[.07]" aria-hidden />
      <span className="pointer-events-none absolute -bottom-24 -left-10 size-56 rounded-full bg-black/10" aria-hidden />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <span className="truncate text-[13px] font-semibold uppercase tracking-[0.12em] text-white/90">{bankName(c.bank) || (paylater ? "Pay later" : "Credit card")}</span>
          {paylater ? <HandCoins size={22} weight="duotone" className="shrink-0 text-white/80" /> : <Network n={c.network} />}
        </div>
        <div>
          <div className="num text-[15px] tracking-[0.22em] text-white/90">{c.last4 ? `••••  ${c.last4}` : "••••  ••••"}</div>
          <div className="mt-1 truncate text-[11px] font-medium uppercase tracking-[0.1em] text-white/75">{c.name}</div>
        </div>
      </div>
    </div>
  );
}
