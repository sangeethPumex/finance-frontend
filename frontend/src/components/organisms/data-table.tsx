import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { EmptyState } from "../molecules";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right";
  className?: string;
};

export type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyText?: string;
  emptyIcon?: Icon;
};

/** Bordered table with a tinted header row and soft dividers. Shows an empty state when there are no rows. */
export function DataTable<T>({ columns, rows, rowKey, loading, emptyText = "Nothing here yet", emptyIcon }: DataTableProps<T>) {
  if (rows.length === 0) return loading ? null : <EmptyState icon={emptyIcon}>{emptyText}</EmptyState>;
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px] text-sub">
          <thead>
            <tr className="border-b border-line bg-subtle">
              {columns.map((c) => (
                <th key={c.key} className={cn("px-4 py-2.5 text-[13px] font-medium text-muted", c.align === "right" && "text-right", c.className)}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={rowKey(r)} className="border-b border-line-soft transition-colors last:border-0 hover:bg-hover">
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3 align-middle", c.align === "right" && "text-right", c.className)}>{c.cell(r)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
