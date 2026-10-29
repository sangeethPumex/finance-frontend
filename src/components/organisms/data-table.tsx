import { CaretDown, CaretUp, type Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { EmptyState } from "../molecules";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right";
  className?: string;
  /** The name the server sorts this column by. Set it to make the header a sort button (needs sort and onSort on the table). */
  sortKey?: string;
};

export type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyText?: string;
  emptyIcon?: Icon;
  sort?: { field: string; dir: "asc" | "desc" };
  onSort?: (field: string) => void;
};

/** Bordered table with a tinted header row and soft dividers. Shows an empty state when there are no rows. */
export function DataTable<T>({ columns, rows, rowKey, loading, emptyText = "Nothing here yet", emptyIcon, sort, onSort }: DataTableProps<T>) {
  if (rows.length === 0) return loading ? null : <EmptyState icon={emptyIcon}>{emptyText}</EmptyState>;
  const [title, ...rest] = columns;
  const actions = rest.filter((c) => !c.header);
  const fields = rest.filter((c) => c.header);
  return (
    <>
      {/* Phone: one card per row; the first column is the title, header-less columns are actions. */}
      <ul className="divide-y divide-line-soft overflow-hidden rounded-lg border border-line md:hidden">
        {rows.map((r) => (
          <li key={rowKey(r)} className="px-4 py-3 text-[13px] text-sub">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 font-medium text-ink">{title.cell(r)}</div>
              {actions.length > 0 && <div className="flex shrink-0 items-center gap-1">{actions.map((c) => <span key={c.key}>{c.cell(r)}</span>)}</div>}
            </div>
            <dl className="mt-1.5 space-y-1">
              {fields.map((c) => (
                <div key={c.key} className="flex items-baseline justify-between gap-3">
                  <dt className="text-[11px] uppercase tracking-wide text-faint">{c.header}</dt>
                  <dd className="min-w-0 text-right">{c.cell(r)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    <div className="hidden overflow-hidden rounded-lg border border-line md:block">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px] text-sub">
          <thead>
            <tr className="border-b border-line bg-subtle">
              {columns.map((c) => (
                <th key={c.key} aria-sort={c.sortKey && sort?.field === c.sortKey ? (sort.dir === "asc" ? "ascending" : "descending") : undefined} className={cn("px-4 py-2.5 text-[13px] font-medium text-muted", c.align === "right" && "text-right", c.className)}>
                  {c.sortKey && onSort ? (
                    <button type="button" onClick={() => onSort(c.sortKey!)} className="inline-flex items-center gap-1 hover:text-ink">
                      {c.header}
                      {sort?.field === c.sortKey && (sort.dir === "asc" ? <CaretUp size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />)}
                    </button>
                  ) : c.header}
                </th>
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
    </>
  );
}
