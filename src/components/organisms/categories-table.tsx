"use client";

import { Tag } from "@phosphor-icons/react";
import { api, NAME_KEYS, useListCache, useWrite, type Category } from "@/lib/api";
import { DataTable, type Column, type DataTableProps } from "./data-table";
import { EditDialog } from "./edit-dialog";

function EditCategory({ c }: { c: Category }) {
  const save = useWrite((body: object) => api(`/categories/${c.id}`, { method: "PATCH", body }), NAME_KEYS);
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
  { key: "name", header: "Name", sortKey: "name", cell: (c) => c.name },
  { key: "edit", header: "", align: "right", cell: (c) => <EditCategory c={c} /> },
];

export function CategoriesTable({ categories, loading, emptyText, sort, onSort }: { categories: Category[]; loading?: boolean; emptyText?: string; sort?: DataTableProps<Category>["sort"]; onSort?: (field: string) => void }) {
  return <DataTable columns={columns} rows={categories} rowKey={(c) => c.id} loading={loading} sort={sort} onSort={onSort} emptyIcon={Tag} emptyText={emptyText ?? "No categories yet"} />;
}
