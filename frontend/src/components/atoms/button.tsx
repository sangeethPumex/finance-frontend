import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "solid" | "ghost" | "quiet";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const variants: Record<ButtonVariant, string> = {
  solid: "bg-ink text-white hover:-translate-y-px hover:scale-[1.015] hover:bg-black/80",
  ghost: "border border-strong text-muted hover:bg-tint hover:text-sub",
  quiet: "text-muted hover:bg-tint hover:text-ink",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-9 gap-2 px-4 text-[13px]",
  lg: "h-11 gap-2 px-6 text-sm",
  icon: "size-8 p-0",
};

const iconPx: Record<ButtonSize, number> = { sm: 13, md: 14, lg: 16, icon: 15 };

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Phosphor icon drawn before the label; the only content of an icon-size button. */
  icon?: Icon;
  loading?: boolean;
};

export function Button({ variant = "solid", size = "md", icon: Icon, loading, disabled, className, children, ...p }: ButtonProps) {
  return (
    <button
      type="button"
      {...p}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium leading-none tracking-[0.02em] transition-all duration-200 ease-out active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {Icon && <Icon size={iconPx[size]} />}
      {children}
    </button>
  );
}
