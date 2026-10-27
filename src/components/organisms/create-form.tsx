"use client";

import { useState } from "react";
import { Plus, type Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { Button, Input, Select } from "../atoms";
import { FormField, InlineError } from "../molecules";

export type FieldDef = {
  name: string;
  label?: string;
  placeholder?: string;
  type?: "text" | "password" | "datetime-local" | "select";
  /** For type "select". The first empty option is the placeholder. */
  options?: { value: string; label: string }[];
  required?: boolean;
  /** Initial value, used by EditDialog. */
  defaultValue?: string;
  pattern?: string;
  maxLength?: number;
  inputMode?: "text" | "numeric" | "decimal";
  hint?: string;
  /** Grid layout only: 2 spans both columns. */
  span?: 1 | 2;
  className?: string;
};

export type CreateFormProps = {
  fields: FieldDef[];
  /** Called with the field values. Return a string to show a validation error; call done() on success to close and reset. */
  onSubmit: (values: Record<string, string>, done: () => void) => string | void;
  submitLabel?: string;
  submitIcon?: Icon;
  /** inline: one wrapping row. grid: two columns inside a bordered box. */
  layout?: "inline" | "grid";
  /** When true, shows only a trigger button until opened. */
  collapsible?: boolean;
  triggerLabel?: string;
  pending?: boolean;
  /** Error from the request, shown beside the buttons. */
  error?: unknown;
  className?: string;
};

/** Config-driven "add one" form, so every list page creates things the same way. */
export function CreateForm({ fields, onSubmit, submitLabel = "Add", submitIcon = Plus, layout = "inline", collapsible = false, triggerLabel = "New", pending, error, className }: CreateFormProps) {
  const [open, setOpen] = useState(!collapsible);
  const [localError, setLocalError] = useState("");

  if (!open) {
    return <Button icon={Plus} onClick={() => setOpen(true)} className={className}>{triggerLabel}</Button>;
  }

  return (
    <form
      className={cn(layout === "grid" ? "grid gap-3 rounded-lg border border-line p-4 sm:grid-cols-2" : "flex flex-wrap items-end gap-2", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const values = Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, String(v)]));
        const problem = onSubmit(values, () => {
          form.reset();
          if (collapsible) setOpen(false);
        });
        setLocalError(problem ?? "");
      }}
    >
      {fields.map((f) => {
        const common = { name: f.name, required: f.required, "aria-label": f.label ?? f.placeholder };
        return (
          <FormField key={f.name} label={f.label} hint={f.hint} className={cn(layout === "grid" && f.span === 2 && "sm:col-span-2")}>
            {f.type === "select" ? (
              <Select {...common} defaultValue="" className={f.className}>
                <option value="">{f.placeholder ?? "Select…"}</option>
                {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            ) : (
              <Input {...common} type={f.type ?? "text"} placeholder={f.placeholder} pattern={f.pattern} maxLength={f.maxLength} inputMode={f.inputMode} className={f.className} />
            )}
          </FormField>
        );
      })}
      <div className={cn("flex flex-wrap items-center gap-2", layout === "grid" && "sm:col-span-2")}>
        <Button type="submit" icon={submitIcon} loading={pending}>{submitLabel}</Button>
        {collapsible && <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>}
        <InlineError error={localError || error} />
      </div>
    </form>
  );
}
