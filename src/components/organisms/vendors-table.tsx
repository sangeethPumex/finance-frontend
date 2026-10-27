"use client";

import { Storefront, Trash } from "@phosphor-icons/react";
import { api, useWrite, type Category, type Vendor } from "@/lib/api";
import { Button, Input, Select } from "../atoms";
import { InlineError, Tag } from "../molecules";
import { DataTable, type Column } from "./data-table";

const patch = (v: Vendor, body: object) => api(`/vendors/${v.id}`, { method: "PATCH", body });

function NameCell({ v }: { v: Vendor }) {
  const rename = useWrite((name: string) => patch(v, { name }));
  return (
    <span className="flex flex-col">
      {/* key resets the field to the saved name once a rename is refetched */}
      <Input
        key={v.name}
        variant="ghost"
        size="sm"
        defaultValue={v.name}
        aria-label={`Name of ${v.name}`}
        onBlur={(e) => {
          const name = e.target.value.trim();
          if (name && name !== v.name) rename.mutate(name);
          else e.target.value = v.name;
        }}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
      <InlineError error={rename.error} />
    </span>
  );
}

function CategoryCell({ v, categories }: { v: Vendor; categories: Category[] }) {
  const set = useWrite((category_id: string) => patch(v, { category_id }));
  return (
    <span className="flex items-center gap-2">
      <Select size="sm" value={v.category_id ?? ""} onChange={(e) => e.target.value && set.mutate(e.target.value)} aria-label={`Category for ${v.name}`}>
        <option value="">None</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <InlineError error={set.error} />
    </span>
  );
}

function AliasCell({ v }: { v: Vendor }) {
  const aliases = v.aliases ?? [];
  const add = useWrite((alias: string) => api(`/vendors/${v.id}/aliases`, { method: "POST", body: { alias } }));
  const remove = useWrite((alias: string) => patch(v, { aliases: aliases.filter((a) => a !== alias) }));
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {aliases.map((a) => <Tag key={a} onRemove={() => remove.mutate(a)} removeLabel={`Remove alias ${a}`}>{a}</Tag>)}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          add.mutate(String(new FormData(form).get("alias")), { onSuccess: () => form.reset() });
        }}
      >
        <Input size="sm" name="alias" placeholder="+ alias" className="w-28" aria-label={`Add alias to ${v.name}`} required />
      </form>
      <InlineError error={add.error || remove.error} />
    </span>
  );
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

export function VendorsTable({ vendors, categories, loading }: { vendors: Vendor[]; categories: Category[]; loading?: boolean }) {
  const columns: Column<Vendor>[] = [
    { key: "name", header: "Vendor", cell: (v) => <NameCell v={v} /> },
    { key: "category", header: "Category", cell: (v) => <CategoryCell v={v} categories={categories} /> },
    { key: "aliases", header: "Aliases", cell: (v) => <AliasCell v={v} /> },
    { key: "delete", header: "", align: "right", cell: (v) => <DeleteCell v={v} /> },
  ];
  return <DataTable columns={columns} rows={vendors} rowKey={(v) => v.id} loading={loading} emptyIcon={Storefront} emptyText="No vendors yet. Save one from a transaction that needs review." />;
}
