import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

/** Label above (with an optional leading icon), hint or error below. Wrap any input-like child. */
export function FormField({ label, icon: Icon, hint, error, className, children }: { label?: string; icon?: Icon; hint?: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      {label && <span className="flex items-center gap-1.5 text-xs font-semibold text-sub">{Icon && <Icon size={14} className="text-muted" />}{label}</span>}
      {children}
      {(error || hint) && <span className={cn("text-xs", error ? "text-ink underline decoration-dotted" : "text-faint")}>{error ?? hint}</span>}
    </label>
  );
}
