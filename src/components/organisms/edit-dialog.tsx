"use client";

import { useState } from "react";
import { PencilSimple } from "@phosphor-icons/react";
import { Button, Input, Select } from "../atoms";
import { FormField, InlineError, Modal } from "../molecules";
import type { FieldDef } from "./create-form";

export type EditDialogProps = {
  /** Dialog heading, also the trigger's accessible label. */
  title: string;
  /** Each field's defaultValue is what the record has now. */
  fields: FieldDef[];
  /** Called with the field values. Return a string to show a validation error; call done() on success to close. */
  onSave: (values: Record<string, string>, done: () => void) => string | void;
  pending?: boolean;
  /** Error from the request, shown beside the buttons. */
  error?: unknown;
};

/** Pencil button that opens the reusable edit popup. Config-driven, like CreateForm. */
export function EditDialog({ title, fields, onSave, pending, error }: EditDialogProps) {
  const [open, setOpen] = useState(false);
  const [localError, setLocalError] = useState("");
  const close = () => { setOpen(false); setLocalError(""); };

  return (
    <>
      <Button variant="quiet" size="icon" icon={PencilSimple} aria-label={title} onClick={() => setOpen(true)} />
      {open && (
        <Modal title={title} subtitle="Changes apply as soon as you save" icon={PencilSimple} onClose={close}>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const values = Object.fromEntries([...new FormData(e.currentTarget)].map(([k, v]) => [k, String(v)]));
              setLocalError(onSave(values, close) ?? "");
            }}
          >
            {fields.map((f) => {
              const common = { name: f.name, required: f.required, defaultValue: f.defaultValue, "aria-label": f.label ?? f.placeholder };
              return (
                <FormField key={f.name} label={f.label} hint={f.hint}>
                  {f.type === "select" ? (
                    <Select {...common}>
                      <option value="">{f.placeholder ?? "None"}</option>
                      {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                  ) : (
                    <Input {...common} type={f.type ?? "text"} placeholder={f.placeholder} pattern={f.pattern} maxLength={f.maxLength} inputMode={f.inputMode} />
                  )}
                </FormField>
              );
            })}
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <Button type="submit" loading={pending}>Save</Button>
              <Button variant="ghost" onClick={close}>Cancel</Button>
              <InlineError error={localError || error} />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
