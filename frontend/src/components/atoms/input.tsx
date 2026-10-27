import { cn } from "@/lib/cn";
import { fieldClass, type FieldSize, type FieldVariant } from "./field";

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  size?: FieldSize;
  variant?: FieldVariant;
  invalid?: boolean;
};

export function Input({ size, variant, invalid, className, ...p }: InputProps) {
  return <input aria-invalid={invalid || undefined} {...p} className={cn(fieldClass(size, variant, invalid), className)} />;
}
