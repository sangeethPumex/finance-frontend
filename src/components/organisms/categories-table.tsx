"use client";

import { Tag } from "@phosphor-icons/react";
import type { Category } from "@/lib/api";
import { DataTable, type Column } from "./data-table";

const columns: Column<Category>[] = [{ key: "name", header: "Name", cell: (c) => c.name }];

export function CategoriesTable({ categories, loading }: { categories: Category[]; loading?: boolean }) {
  return <DataTable columns={columns} rows={categories} rowKey={(c) => c.id} loading={loading} emptyIcon={Tag} emptyText="No categories yet" />;
}
