import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

export type CardVariant = "outline" | "flat";
export type CardPadding = "none" | "sm" | "md";

const variants: Record<CardVariant, string> = { outline: "overflow-hidden border border-line bg-surface", flat: "bg-tint" };
const paddings: Record<CardPadding, string> = { none: "", sm: "px-4 py-3", md: "px-4 py-4 sm:px-6 sm:py-5" };
/** Pulls the title strip out to the card's edges, undoing the padding above. */
const bleed: Record<CardPadding, string> = { none: "", sm: "-mx-4 -mt-3", md: "-mx-4 -mt-4 sm:-mx-6 sm:-mt-5" };

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
        <div className={cn("mb-4 flex flex-wrap items-center justify-between gap-3", title && "border-b border-line bg-tint px-4 py-2.5 sm:px-6", title && bleed[padding])}>
          {title ? (
            <div className="flex items-center gap-2.5">
              {Icon && <Icon size={15} weight="duotone" className="text-muted" />}
              <h2 className="eyebrow">{title}</h2>
            </div>
          ) : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
