"use client";

import { useState } from "react";
import { GitMerge } from "@phosphor-icons/react";
import { api, useAct, type Vendor } from "@/lib/api";
import { Button, Select } from "../atoms";
import { FormField, Modal } from "../molecules";

/** Folds a duplicate vendor ("SWIGGY") into another ("Swiggy Instamart"): its transactions move over and its names become aliases of the target. */
export function MergeVendorDialog({ vendor, vendors, onClose }: { vendor: Vendor; vendors: Vendor[]; onClose: () => void }) {
  const act = useAct();
  const [into, setInto] = useState("");
  const target = vendors.find((v) => v.id === into);
  return (
    <Modal title={`Merge ${vendor.name}`} subtitle="Its transactions and aliases move to the vendor you pick" icon={GitMerge} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); if (target) act(() => api(`/vendors/${vendor.id}/merge`, { method: "POST", body: { into } }), { ok: `Merged into ${target.name}`, onDone: onClose }); }} className="space-y-4">
        <FormField label="Merge into" hint={target ? `${vendor.name} is deleted. Future messages that match it land on ${target.name}, in ${target.name}'s category` : undefined}>
          <Select aria-label="Merge into" value={into} onChange={(e) => setInto(e.target.value)}>
            <option value="">Pick a vendor…</option>
            {vendors.filter((v) => v.id !== vendor.id).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select>
        </FormField>
        <div className="border-t border-line pt-4"><Button type="submit" disabled={!target}>Merge</Button></div>
      </form>
    </Modal>
  );
}
