"use client";

import { Storefront } from "@phosphor-icons/react";
import { CreateForm, VendorsTable, type FieldDef } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { api, useCategories, useVendors, useWrite } from "@/lib/api";

export default function Page() {
  const vendors = useVendors(), cats = useCategories();
  const add = useWrite((body: object) => api("/vendors", { method: "POST", body }));
  const fields: FieldDef[] = [
    { name: "name", placeholder: "New vendor", required: true },
    { name: "category", type: "select", placeholder: "No category", options: (cats.data ?? []).map((c) => ({ value: c.id, label: c.name })) },
  ];
  return (
    <PageLayout title="Vendors" icon={Storefront} error={vendors.error}>
      <CreateForm className="mb-6" fields={fields} pending={add.isPending} error={add.error}
        onSubmit={(v, done) => { add.mutate({ name: v.name, category_id: v.category || undefined, aliases: [v.name.toLowerCase()] }, { onSuccess: done }); }} />
      <VendorsTable vendors={vendors.data ?? []} categories={cats.data ?? []} loading={vendors.isLoading} />
    </PageLayout>
  );
}
