import { cn } from "@/lib/cn";

/** Segmented control: 2 to 4 views of the same data. */
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string }[] }) {
  return (
    <div role="tablist" className="inline-flex gap-0.5 rounded-lg border border-line bg-tint p-[3px]">
      {items.map((i) => (
        <button
          key={i.value}
          type="button"
          role="tab"
          aria-selected={i.value === value}
          onClick={() => onChange(i.value)}
          className={cn("rounded-md px-4 py-[7px] text-[13px] tracking-[0.02em] transition-colors", i.value === value ? "bg-ink font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,.06)]" : "text-muted hover:text-sub")}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}
