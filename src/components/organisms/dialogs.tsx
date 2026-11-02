"use client";

import { createContext, useContext, useMemo, useRef, useState } from "react";
import { PencilSimple, Question, Warning } from "@phosphor-icons/react";
import { Button, Input } from "../atoms";
import { FormField, Modal } from "../molecules";

export type ConfirmOptions = {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger: red button, and Cancel has the focus so Enter never deletes by accident. */
  tone?: "danger" | "normal";
};

export type PromptOptions = {
  title: string;
  label: string;
  message?: React.ReactNode;
  initial?: string;
  placeholder?: string;
  confirmLabel?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  /** Returns a message to show under the field, or nothing when the (trimmed) value is fine. */
  validate?: (value: string) => string | undefined;
};

/** Asks "are you sure?" in the app's own popup instead of the browser's. */
export function ConfirmDialog({ title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", tone, onConfirm, onClose }: ConfirmOptions & { onConfirm: () => void; onClose: () => void }) {
  const danger = tone === "danger";
  return (
    <Modal title={title} icon={danger ? Warning : Question} onClose={onClose}>
      {message && <div className="text-[14px] leading-relaxed text-sub">{message}</div>}
      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant={danger ? "danger" : "solid"} autoFocus={!danger} onClick={onConfirm}>{confirmLabel}</Button>
        <Button variant="ghost" autoFocus={danger} onClick={onClose}>{cancelLabel}</Button>
      </div>
    </Modal>
  );
}

/** Asks for one short value in the app's own popup instead of the browser's. */
export function PromptDialog({ title, label, message, initial = "", placeholder, confirmLabel = "Save", inputMode, maxLength, validate, onSubmit, onClose }: PromptOptions & { onSubmit: (value: string) => void; onClose: () => void }) {
  const [value, setValue] = useState(initial), [error, setError] = useState("");
  return (
    <Modal title={title} icon={PencilSimple} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const v = value.trim(), bad = validate?.(v);
          if (bad) { setError(bad); e.currentTarget.querySelector("input")?.focus(); } else onSubmit(v); // back to the field to fix it
        }}
      >
        {message && <div className="text-[14px] leading-relaxed text-sub">{message}</div>}
        <FormField label={label} error={error || undefined}>
          <Input autoFocus value={value} inputMode={inputMode} maxLength={maxLength} placeholder={placeholder} invalid={!!error}
            onFocus={(e) => e.currentTarget.select()} onChange={(e) => { setValue(e.target.value); setError(""); }} />
        </FormField>
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <Button type="submit">{confirmLabel}</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

type Dialogs = {
  /** Resolves true when the user confirms, false when they cancel or close. */
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  /** Resolves the trimmed value, or null when the user cancels or closes. */
  prompt: (o: PromptOptions) => Promise<string | null>;
};

const Ctx = createContext<Dialogs | null>(null);

/** `const dialogs = useDialogs(); if (await dialogs.confirm({...})) doIt();` Use it where window.confirm or window.prompt would have gone. */
export function useDialogs(): Dialogs {
  const d = useContext(Ctx);
  if (!d) throw new Error("useDialogs needs a DialogProvider above it");
  return d;
}

type Open =
  | { kind: "confirm"; o: ConfirmOptions; done: (ok: boolean) => void }
  | { kind: "prompt"; o: PromptOptions; done: (v: string | null) => void };

/** Shows one popup at a time; asking while one is open counts as cancelling the new one. */
export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null);
  const busy = useRef(false);
  const dialogs = useMemo<Dialogs>(() => {
    const ask = <T,>(make: (done: (v: T) => void) => Open, cancelled: T) =>
      new Promise<T>((resolve) => {
        if (busy.current) return resolve(cancelled);
        busy.current = true;
        setOpen(make((v) => { busy.current = false; setOpen(null); resolve(v); }));
      });
    return {
      confirm: (o) => ask<boolean>((done) => ({ kind: "confirm", o, done }), false),
      prompt: (o) => ask<string | null>((done) => ({ kind: "prompt", o, done }), null),
    };
  }, []);
  return (
    <Ctx.Provider value={dialogs}>
      {children}
      {open?.kind === "confirm" && <ConfirmDialog {...open.o} onConfirm={() => open.done(true)} onClose={() => open.done(false)} />}
      {open?.kind === "prompt" && <PromptDialog {...open.o} onSubmit={open.done} onClose={() => open.done(null)} />}
    </Ctx.Provider>
  );
}
