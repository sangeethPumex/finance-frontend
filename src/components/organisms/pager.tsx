"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { PAGE_SIZES } from "@/lib/paging";
import { Button, Select } from "../atoms";

/** "1–10 of 84", a rows-per-page choice and Previous / Next. Hidden while there is nothing to page. */
export function Pager({ page, pages, total, limit, onPage, onLimit, sizes = PAGE_SIZES }: {
  page: number; pages: number; total: number; limit: number; onPage: (p: number) => void; onLimit?: (n: number) => void; sizes?: number[];
}) {
  if (total === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
      <span className="flex items-center gap-3">
        <span>{(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
        {onLimit && (
          <label className="flex items-center gap-1.5">
            Show
            <Select size="sm" aria-label="Rows per page" value={limit} onChange={(e) => onLimit(Number(e.target.value))}>
              {sizes.map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </label>
        )}
      </span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" icon={CaretLeft} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <span className="num">Page {page} of {Math.max(pages, 1)}</span>
        <Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next <CaretRight size={14} /></Button>
      </div>
    </div>
  );
}
