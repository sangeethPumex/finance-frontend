import { cn } from "@/lib/cn";

export type FieldSize = "sm" | "md";
/** outline: normal bordered field. ghost: borderless until hovered, for edit-in-place. */
export type FieldVariant = "outline" | "ghost";

/** Shared look of Input and Select. */
export const fieldClass = (size: FieldSize = "md", variant: FieldVariant = "outline", invalid = false) =>
  cn(
    "rounded-md border bg-white px-3 text-[13px] text-ink outline-none transition-colors focus:border-ink focus:ring-[3px] focus:ring-black/[0.06]",
    size === "sm" ? "h-8" : "h-[38px]",
    variant === "ghost" ? "border-transparent hover:border-line" : "border-line hover:border-strong",
    invalid && "border-ink ring-[3px] ring-black/[0.08]",
  );
