import { Bank } from "@phosphor-icons/react";
import { bankLogo } from "@/lib/banks";
import { cn } from "@/lib/cn";

/** Square bank logo; falls back to a generic bank icon for banks without a bundled file. */
export function BankLogo({ bank, className }: { bank?: string; className?: string }) {
  const src = bankLogo(bank);
  return (
    <span className={cn("grid size-8 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-white", className)}>
      {src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt={bank ?? ""} className="size-full object-contain p-1" />
        : <Bank size={16} className="text-muted" />}
    </span>
  );
}
