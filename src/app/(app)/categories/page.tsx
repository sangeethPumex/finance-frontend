"use client";

import { Tag } from "@phosphor-icons/react";
import { CategoriesTable, CreateForm, Pager, SearchBox, type FieldDef } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { api, NAME_KEYS, useCategoriesPage, useWrite } from "@/lib/api";
import { usePaging } from "@/lib/paging";

const FIELDS: FieldDef[] = [{ name: "name", placeholder: "New category", required: true }];

export default function Page() {
  const paging = usePaging({ limit: 10 });
  const { data, error, isLoading } = useCategoriesPage(paging.req);
  const { items = [], pages = 1, total = 0 } = data ?? {};
  const add = useWrite((body: object) => api("/categories", { method: "POST", body }), NAME_KEYS);
  return (
    <PageLayout title="Categories" icon={Tag} error={error}>
      <CreateForm className="mb-6" fields={FIELDS} pending={add.isPending} error={add.error}
        onSubmit={(v, done) => { add.mutate({ name: v.name }, { onSuccess: done }); }} />
      <div className="mb-4 flex"><SearchBox value={paging.text} onChange={paging.setText} placeholder="Search categories" /></div>
      <CategoriesTable categories={items} loading={isLoading} sort={paging.sort} onSort={paging.toggleSort} emptyText={paging.req.search ? "No categories match" : undefined} />
      <Pager page={paging.page} pages={pages} total={total} limit={paging.size} onPage={paging.setPage} onLimit={paging.setSize} />
    </PageLayout>
  );
}
