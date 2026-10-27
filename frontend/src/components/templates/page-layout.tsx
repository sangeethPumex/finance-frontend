"use client";

import type { Icon } from "@phosphor-icons/react";
import { InlineError, PageHeader } from "../molecules";

/** Standard page: header, request error, then content. */
export function PageLayout({ title, icon, description, action, error, children }: { title: string; icon?: Icon; description?: string; action?: React.ReactNode; error?: unknown; children: React.ReactNode }) {
  return (
    <>
      <PageHeader title={title} icon={icon} description={description} action={action} />
      <div className="mb-4 empty:hidden"><InlineError error={error} /></div>
      {children}
    </>
  );
}
