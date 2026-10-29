"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, useWrite } from "./api";

/** Rupees as typed. Stored by the backend's profile module; the backend decides which month the before-Catalyst amounts belong to. */
export type Holding = { invested: number; current: number };
export type Profile = {
  salary: number; salaryDay: number; sip: number; fixedMonthly: number; bufferTarget: number;
  mf: Holding; stocks: Holding; other: Holding; goals: string;
  memory: string[]; // noted by the AI from chats; the backend ignores it on save
  prior: { spent: number; income: number };
};

export const EMPTY_PROFILE: Profile = {
  salary: 0, salaryDay: 1, sip: 0, fixedMonthly: 0, bufferTarget: 0,
  mf: { invested: 0, current: 0 }, stocks: { invested: 0, current: 0 }, other: { invested: 0, current: 0 }, goals: "", memory: [], prior: { spent: 0, income: 0 },
};

export function useForget() {
  const qc = useQueryClient();
  return (fact: string) => api(`/profile/memory?fact=${encodeURIComponent(fact)}`, { method: "DELETE" })
    .then(() => qc.invalidateQueries({ queryKey: ["profile"] }))
    .catch((e) => toast.error(e instanceof Error ? e.message : "Could not remove"));
}

export function useProfile() {
  const q = useQuery({ queryKey: ["profile"], queryFn: async () => ({ ...EMPTY_PROFILE, ...(await api<Partial<Profile>>("/profile")) }) });
  const w = useWrite((p: Profile) => api("/profile", { method: "PUT", body: p }));
  return { profile: q.data ?? EMPTY_PROFILE, save: (p: Profile, onDone?: () => void) => w.mutate(p, { onSuccess: () => { toast.success("Profile saved"); onDone?.(); }, onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save") }), saving: w.isPending, ready: q.isSuccess, error: q.error || w.error };
}
