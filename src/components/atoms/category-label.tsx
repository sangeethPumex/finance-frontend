import { categoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/cn";

/** A category's icon beside its name, wherever a category is shown as text. */
export function CategoryLabel({ name, icon, className }: { name: string; icon?: string; className?: string }) {
  const Icon = categoryIcon(icon);
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <Icon size={15} weight={icon ? "duotone" : "regular"} className="shrink-0" />
      <span className="truncate">{name}</span>
    </span>
  );
}
