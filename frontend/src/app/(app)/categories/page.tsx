"use client";

import { Tag } from "@phosphor-icons/react";
import { CategoriesTable, CreateForm, type FieldDef } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { api, useCategories, useWrite } from "@/lib/api";

const FIELDS: FieldDef[] = [{ name: "name", placeholder: "New category", required: true }];

export default function Page() {
  const { data, error, isLoading } = useCategories();
  const add = useWrite((body: object) => api("/categories", { method: "POST", body }));
  return (
    <PageLayout title="Categories" icon={Tag} error={error}>
      <CreateForm className="mb-6" fields={FIELDS} pending={add.isPending} error={add.error}
        onSubmit={(v, done) => { add.mutate({ name: v.name }, { onSuccess: done }); }} />
      <CategoriesTable categories={data ?? []} loading={isLoading} />
    </PageLayout>
  );
}
