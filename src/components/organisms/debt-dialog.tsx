"use client";

import { useState } from "react";
import { CurrencyInr, HandCoins, Notepad, User, UsersThree } from "@phosphor-icons/react";
import { api, useAct } from "@/lib/api";
import { rupeesToPaise } from "@/lib/money";
import { Button, Input, Select } from "../atoms";
import { FormField, Modal } from "../molecules";

const SOURCES = ["GPay", "PhonePe", "Paytm", "Other UPI", "Cash", "Other"];
const isUpi = (s: string) => s !== "Cash" && s !== "Other";

/** Adds who owes the user what by hand. For a UPI app it also takes the group name, so the debt can be found there. */
export function DebtDialog({ onClose }: { onClose: () => void }) {
  const act = useAct(["debts"]);
  const [source, setSource] = useState("GPay");
  const [group, setGroup] = useState("");
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const paise = rupeesToPaise(amount);
  const ok = person.trim() !== "" && paise !== null && paise > 0;
  const save = () => act(() => api("/debts", { method: "POST", body: { person, source, group: isUpi(source) ? group : "", note, amount_paise: paise } }), { ok: "Added", onDone: onClose });

  return (
    <Modal title="Someone owes me" subtitle="Add it by hand, then mark it paid when it comes back" icon={HandCoins} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); if (ok) save(); }} className="space-y-4">
        <FormField label="From where">
          <Select value={source} onChange={(e) => setSource(e.target.value)} aria-label="From where">{SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
        </FormField>
        {isUpi(source) && <FormField label="Group name" icon={UsersThree} hint="Optional. The group in the app"><Input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Goa trip" /></FormField>}
        <FormField label="Who owes you" icon={User}><Input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Ravi" autoFocus /></FormField>
        <FormField label="How much (₹)" icon={CurrencyInr}><Input type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} /></FormField>
        <FormField label="Note" icon={Notepad} hint="Optional"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Dinner" /></FormField>
        <div className="flex gap-2 border-t border-line pt-4"><Button type="submit" disabled={!ok}>Save</Button></div>
      </form>
    </Modal>
  );
}
