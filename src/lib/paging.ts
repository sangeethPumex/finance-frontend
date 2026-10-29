import { useEffect, useState } from "react";
import type { PageReq, Sort } from "./api";

export const PAGE_SIZES = [10, 25, 50, 100];

/**
 * State for a server-paged list: page, page size, a debounced search, a sort and filters. Changing the search, sort, size or a filter
 * goes back to page 1. req is what the list hooks take.
 */
export function usePaging({ limit = 10, sort }: { limit?: number; sort?: Sort } = {}) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(limit);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState<Sort | undefined>(sort);
  const [filter, setFilterState] = useState<Record<string, string>>({});

  useEffect(() => { // search as you type, after a short pause
    if (text === search) return;
    const t = setTimeout(() => { setSearch(text); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [text, search]);

  return {
    req: { page, limit: size, search, sort: order, filter } satisfies PageReq,
    text, setText, page, setPage, size, filter,
    setSize: (n: number) => { setSize(n); setPage(1); },
    setFilter: (f: Record<string, string>) => { setFilterState(f); setPage(1); },
    /** Click on a column: first ascending, then descending, then back to the default order. */
    sort: order,
    toggleSort: (field: string) => {
      setOrder((o) => (o?.field !== field ? { field, dir: "asc" } : o.dir === "asc" ? { field, dir: "desc" } : sort));
      setPage(1);
    },
  };
}
