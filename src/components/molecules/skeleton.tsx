import { cn } from "@/lib/cn";

/** A pulsing placeholder block; size it with className. */
export const Skeleton = ({ className }: { className?: string }) => <div aria-hidden className={cn("animate-pulse rounded-sm bg-tint", className)} />;

/** Same footprint as a StatCard, shown while its numbers load. */
export function StatSkeleton() {
  return (
    <div className="border border-line bg-white px-6 py-5" role="status" aria-label="Loading">
      <div className="flex items-center justify-between"><Skeleton className="h-3 w-20" /><Skeleton className="size-8" /></div>
      <Skeleton className="mt-4 h-6 w-28" />
      <Skeleton className="mt-3 h-3 w-40" />
    </div>
  );
}

/** Same footprint as a loan or fund card. */
export function RowSkeleton() {
  return (
    <div className="flex items-start gap-4 border border-line bg-white p-5" role="status" aria-label="Loading">
      <Skeleton className="size-10 shrink-0" />
      <div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-6 w-28" /><Skeleton className="h-3 w-52" /></div>
      <Skeleton className="h-8 w-28" />
    </div>
  );
}

/** A card-sized block, e.g. for a chart. */
export const PanelSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("border border-line bg-white p-6", className)} role="status" aria-label="Loading"><Skeleton className="h-4 w-36" /><Skeleton className="mt-5 h-56 w-full" /></div>
);
