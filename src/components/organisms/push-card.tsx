"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bell, BellRinging, BellSlash } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { usePush } from "@/lib/push";
import { Button } from "../atoms";

/** Turns push notifications on for this device; says what to do when it cannot. */
export function PushCard() {
  const { state, enable, disable, test } = usePush();
  const [busy, setBusy] = useState(false);
  const run = (fn: () => Promise<unknown>, ok?: string) => { setBusy(true); fn().then(() => ok && toast.success(ok)).catch((e) => toast.error(e instanceof Error ? e.message : "Something went wrong")).finally(() => setBusy(false)); };

  if (state === "loading") return null;
  const msg: Partial<Record<typeof state, string>> = {
    unsupported: "This browser cannot show push notifications. On iPhone, add Catalyst to your Home Screen (Share, then Add to Home Screen) and open it from there.",
    "server-off": "Push is not set up on the server yet (VAPID keys are missing), so lists will not alert you.",
    denied: "Notifications are blocked for Catalyst. Turn them on in your phone's Settings, then come back.",
  };
  return (
    <div className={cn("mb-4 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3", state === "on" ? "border-line bg-surface" : "border-line bg-warn-bg")}>
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", state === "on" ? "bg-gain-bg text-gain" : "bg-surface text-warn")}>{state === "on" ? <BellRinging size={17} weight="duotone" /> : <BellSlash size={17} weight="duotone" />}</span>
      <p className="min-w-0 flex-1 text-[13px] text-sub">{state === "on" ? "Notifications are on for this device." : state === "off" ? "Turn on notifications to be alerted before a list is due or a bill is short." : msg[state]}</p>
      {state === "off" && <Button icon={Bell} loading={busy} onClick={() => run(enable, "Notifications on")}>Turn on</Button>}
      {state === "on" && <>
        <Button variant="ghost" size="sm" loading={busy} onClick={() => run(async () => { const r = await test(); if (!r.sent) throw new Error("No device was reached; turn notifications off and on again"); }, "Test sent")}>Send test</Button>
        <Button variant="quiet" size="sm" loading={busy} onClick={() => run(disable, "Notifications off")}>Turn off</Button>
      </>}
    </div>
  );
}
