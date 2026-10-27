import { cn } from "@/lib/cn";

/** Label above, hint or error below. Wrap any input-like child. */
export function FormField({ label, hint, error, className, children }: { label?: string; hint?: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      {label && <span className="text-xs font-medium text-muted">{label}</span>}
      {children}
      {(error || hint) && <span className={cn("text-xs", error ? "text-ink underline decoration-dotted" : "text-faint")}>{error ?? hint}</span>}
    </label>
  );
}
