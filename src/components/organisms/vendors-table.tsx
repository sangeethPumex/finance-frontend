"use client";

import { useState } from "react";
import { GitMerge, Storefront, Trash } from "@phosphor-icons/react";
import { api, useWrite, type Category, type Vendor } from "@/lib/api";
import { Button } from "../atoms";
import { InlineError, Tag } from "../molecules";
import { DataTable, type Column } from "./data-table";
import { EditDialog } from "./edit-dialog";
import { MergeVendorDialog } from "./merge-vendor-dialog";

const patch = (v: Vendor, body: object) => api(`/vendors/${v.id}`, { method: "PATCH", body });

function EditVendor({ v, categories }: { v: Vendor; categories: Category[] }) {
  const save = useWrite((body: object) => patch(v, body));
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
        save.mutate({ name: f.name, aliases, ...(f.category_id ? { category_id: f.category_id } : {}) }, { onSuccess: done });
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
  const del = useWrite(() => api(`/vendors/${v.id}`, { method: "DELETE" }));
  return (
    <span className="flex items-center justify-end">
      <Button
        variant="quiet"
        size="icon"
        icon={Trash}
        aria-label={`Delete ${v.name}`}
        loading={del.isPending}
        onClick={() => confirm(`Delete ${v.name}? Its transactions go back to review.`) && del.mutate(undefined)}
      />
      <InlineError error={del.error} />
    </span>
  );
}

function MergeCell({ v, vendors }: { v: Vendor; vendors: Vendor[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="quiet" size="icon" icon={GitMerge} aria-label={`Merge ${v.name} into another vendor`} title="Merge into another vendor" disabled={vendors.length < 2} onClick={() => setOpen(true)} />
      {open && <MergeVendorDialog vendor={v} vendors={vendors} onClose={() => setOpen(false)} />}
    </>
  );
}

export function VendorsTable({ vendors, categories, loading }: { vendors: Vendor[]; categories: Category[]; loading?: boolean }) {
  const columns: Column<Vendor>[] = [
    { key: "name", header: "Vendor", cell: (v) => v.name },
    { key: "category", header: "Category", cell: (v) => <span className="text-muted">{categories.find((c) => c.id === v.category_id)?.name ?? "—"}</span> },
    { key: "aliases", header: "Aliases", cell: (v) => <AliasList v={v} /> },
    { key: "actions", header: "", align: "right", cell: (v) => <span className="flex items-center justify-end gap-1"><EditVendor v={v} categories={categories} /><MergeCell v={v} vendors={vendors} /><DeleteCell v={v} /></span> },
  ];
  return <DataTable columns={columns} rows={vendors} rowKey={(v) => v.id} loading={loading} emptyIcon={Storefront} emptyText="No vendors yet. Save one from a transaction that needs review." />;
}
