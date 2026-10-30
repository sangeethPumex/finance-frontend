"use client";

import { useState } from "react";
import { Tag } from "@phosphor-icons/react";
import { api, NAME_KEYS, useListCache, useWrite, type Category } from "@/lib/api";
import { categoryIcon } from "@/lib/category-icons";
import { CategoryIconPicker } from "./category-icon-picker";
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

/** The category's icon as a button: click it to pick another from the list. */
function IconCell({ c }: { c: Category }) {
  const [open, setOpen] = useState(false);
  const save = useWrite((body: object) => api(`/categories/${c.id}`, { method: "PATCH", body }), NAME_KEYS);
  const setCategories = useListCache<Category>("categories");
  const Icon = categoryIcon(c.icon);
  return (
    <>
      <button type="button" aria-label={`Change icon for ${c.name}`} title="Change icon" onClick={() => setOpen(true)}
        className="grid size-9 place-items-center rounded-md bg-tint text-ink transition-colors hover:bg-strong"><Icon size={18} weight={c.icon ? "duotone" : "regular"} className={c.icon ? "" : "text-muted"} /></button>
      {open && <CategoryIconPicker name={c.name} current={c.icon} onClose={() => setOpen(false)}
        onPick={(icon) => { setCategories((rows) => rows.map((r) => (r.id === c.id ? { ...r, icon: icon || undefined } : r))); save.mutate({ icon }); setOpen(false); }} />}
    </>
  );
}

const columns: Column<Category>[] = [
  { key: "icon", header: "", cell: (c) => <IconCell c={c} /> },
  { key: "name", header: "Name", sortKey: "name", cell: (c) => c.name },
  { key: "edit", header: "", align: "right", cell: (c) => <EditCategory c={c} /> },
];

export function CategoriesTable({ categories, loading, emptyText, sort, onSort }: { categories: Category[]; loading?: boolean; emptyText?: string; sort?: DataTableProps<Category>["sort"]; onSort?: (field: string) => void }) {
  return <DataTable columns={columns} rows={categories} rowKey={(c) => c.id} loading={loading} sort={sort} onSort={onSort} emptyIcon={Tag} emptyText={emptyText ?? "No categories yet"} />;
}
