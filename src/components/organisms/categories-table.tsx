"use client";

import { Tag } from "@phosphor-icons/react";
import { api, useListCache, useWrite, type Category } from "@/lib/api";
import { DataTable, type Column } from "./data-table";
import { EditDialog } from "./edit-dialog";

function EditCategory({ c }: { c: Category }) {
  const save = useWrite((body: object) => api(`/categories/${c.id}`, { method: "PATCH", body }));
  const setCategories = useListCache<Category>("categories");
  return (
    <EditDialog
      title={`Edit ${c.name}`}
      pending={save.isPending}
      error={save.error}
      fields={[{ name: "name", label: "Name", defaultValue: c.name, required: true }]}
      onSave={(v, done) => { setCategories((rows) => rows.map((r) => (r.id === c.id ? { ...r, name: v.name } : r))); save.mutate({ name: v.name }, { onSuccess: done }); }}
    />
  );
}

const columns: Column<Category>[] = [
  { key: "name", header: "Name", cell: (c) => c.name },
  { key: "edit", header: "", align: "right", cell: (c) => <EditCategory c={c} /> },
];

export function CategoriesTable({ categories, loading }: { categories: Category[]; loading?: boolean }) {
  return <DataTable columns={columns} rows={categories} rowKey={(c) => c.id} loading={loading} emptyIcon={Tag} emptyText="No categories yet" />;
}
