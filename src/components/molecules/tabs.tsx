import { cn } from "@/lib/cn";

/** Segmented control: 2 to 4 views of the same data. */
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string }[] }) {
  return (
    <div role="tablist" className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg border border-line bg-tint p-[3px]">
      {items.map((i) => (
        <button
          key={i.value}
          type="button"
          role="tab"
          aria-selected={i.value === value}
          onClick={() => onChange(i.value)}
          className={cn("shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-[13px] md:px-4 md:py-[7px] tracking-[0.02em] transition-colors", i.value === value ? "bg-ink font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,.06)]" : "text-muted hover:text-sub")}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}
