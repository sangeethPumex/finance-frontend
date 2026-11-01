"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

/** unsupported = no Push API (on iPhone: open the app from the Home Screen icon, not Safari); off = allowed to ask; on = this device is subscribed. */
export type PushState = "loading" | "unsupported" | "server-off" | "denied" | "off" | "on";

const b64 = (s: string) => {
  const raw = atob((s + "=".repeat((4 - (s.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const registration = () => navigator.serviceWorker.register("/sw.js").then(() => navigator.serviceWorker.ready);

/** Whether this device gets pushes, with switches to turn them on, off and send a test. */
export function usePush() {
  const [state, setState] = useState<PushState>("loading");

  const refresh = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported");
    const { enabled } = await api<{ enabled: boolean }>("/jogger/push/key");
    if (!enabled) return setState("server-off");
    if (Notification.permission === "denied") return setState("denied");
    const sub = await (await registration()).pushManager.getSubscription();
    setState(sub && Notification.permission === "granted" ? "on" : "off");
  }, []);

  useEffect(() => { refresh().catch(() => setState("unsupported")); }, [refresh]);

  const enable = useCallback(async () => {
    // Must run straight from a tap: iOS only shows the permission prompt for a user gesture.
    if ((await Notification.requestPermission()) !== "granted") return setState("denied");
    const { key } = await api<{ key: string }>("/jogger/push/key");
    const reg = await registration();
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) }));
    await api("/jogger/push", { method: "POST", body: sub.toJSON() });
    setState("on");
  }, []);

  const disable = useCallback(async () => {
    const sub = await (await registration()).pushManager.getSubscription();
    if (sub) {
      await api("/jogger/push/unsubscribe", { method: "POST", body: { endpoint: sub.endpoint } });
      await sub.unsubscribe();
    }
    setState("off");
  }, []);

  const test = useCallback(() => api<{ sent: number }>("/jogger/push/test", { method: "POST", body: {} }), []);

  return { state, enable, disable, test };
}
