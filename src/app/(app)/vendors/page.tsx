"use client";

import { Storefront } from "@phosphor-icons/react";
import { Select } from "@/components/atoms";
import { CreateForm, Pager, SearchBox, VendorsTable, type FieldDef } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { api, NAME_KEYS, useCategories, useVendorsPage, useWrite } from "@/lib/api";
import { usePaging } from "@/lib/paging";

export default function Page() {
  const paging = usePaging({ limit: 10 });
  const vendors = useVendorsPage(paging.req), cats = useCategories();
  const { items = [], pages = 1, total = 0 } = vendors.data ?? {};
  const add = useWrite((body: object) => api("/vendors", { method: "POST", body }), NAME_KEYS);
  const fields: FieldDef[] = [
    { name: "name", placeholder: "New vendor", required: true },
    { name: "category", type: "select", placeholder: "No category", options: (cats.data ?? []).map((c) => ({ value: c.id, label: c.name })) },
  ];
  const filtered = !!paging.req.search || Object.values(paging.filter).some(Boolean);
  return (
    <PageLayout title="Vendors" icon={Storefront} error={vendors.error}>
      <CreateForm className="mb-6" fields={fields} pending={add.isPending} error={add.error}
        onSubmit={(v, done) => { add.mutate({ name: v.name, category_id: v.category || undefined, aliases: [v.name.toLowerCase()] }, { onSuccess: done }); }} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox value={paging.text} onChange={paging.setText} placeholder="Search vendor name or alias" />
        <Select aria-label="Category" value={paging.filter.category_id ?? paging.filter.category ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            paging.setFilter(v === "none" || v === "set" ? { category: v } : v ? { category_id: v } : {});
          }}>
          <option value="">All categories</option>
          <option value="none">No category</option>
          {(cats.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>
      <VendorsTable vendors={items} total={total} categories={cats.data ?? []} loading={vendors.isLoading} sort={paging.sort} onSort={paging.toggleSort}
        emptyText={filtered ? "No vendors match" : undefined} />
      <Pager page={paging.page} pages={pages} total={total} limit={paging.size} onPage={paging.setPage} onLimit={paging.setSize} />
    </PageLayout>
  );
}
