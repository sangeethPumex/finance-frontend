import { cn } from "@/lib/cn";
import { fieldClass, type FieldSize, type FieldVariant } from "./field";

export type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  size?: FieldSize;
  variant?: FieldVariant;
  invalid?: boolean;
};

export function Select({ size, variant, invalid, className, ...p }: SelectProps) {
  return <select aria-invalid={invalid || undefined} {...p} className={cn(fieldClass(size, variant, invalid), className)} />;
}
