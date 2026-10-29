import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

export type CardVariant = "outline" | "flat";
export type CardPadding = "none" | "sm" | "md";

const variants: Record<CardVariant, string> = { outline: "border border-line bg-white", flat: "bg-tint" };
const paddings: Record<CardPadding, string> = { none: "", sm: "px-4 py-3", md: "px-4 py-4 sm:px-6 sm:py-5" };

export type CardProps = {
  title?: string;
  icon?: Icon;
  /** Rendered at the right of the title row. */
  action?: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  /** Adds the hover shadow, for cards that are links. */
  interactive?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export function Card({ title, icon: Icon, action, variant = "outline", padding = "md", interactive, className, children }: CardProps) {
  return (
    <section className={cn("min-w-0 rounded-lg", variants[variant], paddings[padding], interactive && "transition-shadow duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,.08)]", className)}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title ? (
            <div className="flex items-center gap-2.5">
              {Icon && <span className="grid size-7 place-items-center rounded-md bg-tint text-ink"><Icon size={15} weight="duotone" /></span>}
              <h2 className="text-[13px] font-semibold tracking-tight">{title}</h2>
            </div>
          ) : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
