"use client";

import { useState } from "react";
import { GitMerge, Storefront, Trash } from "@phosphor-icons/react";
import { api, NAME_KEYS, useListCache, useWrite, type Category, type Vendor } from "@/lib/api";
import { Button } from "../atoms";
import { InlineError, Tag } from "../molecules";
import { DataTable, type Column, type DataTableProps } from "./data-table";
import { EditDialog } from "./edit-dialog";
import { MergeVendorDialog } from "./merge-vendor-dialog";

const patch = (v: Vendor, body: object) => api(`/vendors/${v.id}`, { method: "PATCH", body });

function EditVendor({ v, categories }: { v: Vendor; categories: Category[] }) {
  const save = useWrite((body: object) => patch(v, body), NAME_KEYS);
  const setVendors = useListCache<Vendor>("vendors");
  return (
    <EditDialog
      title={`Edit ${v.name}`}
      pending={save.isPending}
      error={save.error}
      fields={[
        { name: "name", label: "Name", defaultValue: v.name, required: true },
        { name: "category_id", label: "Category", type: "select", placeholder: "None", defaultValue: v.category_id ?? "", options: categories.map((c) => ({ value: c.id, label: c.name })) },
        { name: "aliases", label: "Aliases", defaultValue: (v.aliases ?? []).join(", "), hint: "Comma separated UPI ids or merchant strings" },
      ]}
      onSave={(f, done) => {
        const aliases = f.aliases.split(",").map((a) => a.trim()).filter(Boolean);
        const body = { name: f.name, aliases, ...(f.category_id ? { category_id: f.category_id } : {}) };
        setVendors((rows) => rows.map((r) => (r.id === v.id ? { ...r, ...body } : r)));
        save.mutate(body, { onSuccess: done });
      }}
    />
  );
}

function AliasList({ v }: { v: Vendor }) {
  const aliases = v.aliases ?? [];
  if (aliases.length === 0) return <span className="text-muted">—</span>;
  return <span className="flex flex-wrap gap-1.5">{aliases.map((a) => <Tag key={a}>{a}</Tag>)}</span>;
}

function DeleteCell({ v }: { v: Vendor }) {
  const del = useWrite(() => api(`/vendors/${v.id}`, { method: "DELETE" }), NAME_KEYS);
  const setVendors = useListCache<Vendor>("vendors");
  return (
    <span className="flex items-center justify-end">
      <Button
        variant="quiet"
        size="icon"
        icon={Trash}
        aria-label={`Delete ${v.name}`}
        loading={del.isPending}
        onClick={() => { if (!confirm(`Delete ${v.name}? Its transactions go back to review.`)) return; setVendors((rows) => rows.filter((r) => r.id !== v.id)); del.mutate(undefined); }}
      />
      <InlineError error={del.error} />
    </span>
  );
}

function MergeCell({ v, canMerge }: { v: Vendor; canMerge: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="quiet" size="icon" icon={GitMerge} aria-label={`Merge ${v.name} into another vendor`} title="Merge into another vendor" disabled={!canMerge} onClick={() => setOpen(true)} />
      {open && <MergeVendorDialog vendor={v} onClose={() => setOpen(false)} />}
    </>
  );
}

export function VendorsTable({ vendors, total, categories, loading, emptyText, sort, onSort }: {
  vendors: Vendor[]; total: number; categories: Category[]; loading?: boolean; emptyText?: string; sort?: DataTableProps<Vendor>["sort"]; onSort?: (field: string) => void;
}) {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const columns: Column<Vendor>[] = [
    { key: "name", header: "Vendor", sortKey: "name", cell: (v) => v.name },
    { key: "category", header: "Category", cell: (v) => <span className="text-muted">{(v.category_id && names.get(v.category_id)) || "—"}</span> },
    { key: "aliases", header: "Aliases", cell: (v) => <AliasList v={v} /> },
    { key: "actions", header: "", align: "right", cell: (v) => <span className="flex items-center justify-end gap-1"><EditVendor v={v} categories={categories} /><MergeCell v={v} canMerge={total > 1} /><DeleteCell v={v} /></span> },
  ];
  return <DataTable columns={columns} rows={vendors} rowKey={(v) => v.id} loading={loading} sort={sort} onSort={onSort} emptyIcon={Storefront} emptyText={emptyText ?? "No vendors yet. Save one from a transaction that needs review."} />;
}
