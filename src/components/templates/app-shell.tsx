"use client";

import { useEffect, useState } from "react";
import { NAV_GROUPS } from "@/lib/nav";
import { AppHeader, MobileNav, Sidebar } from "../organisms";

const STORAGE_KEY = "catalyst.nav";

/** Sidebar and header around the scrolling content area. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  // Restore after mount so server and client render the same first frame.
  useEffect(() => {
    try { setCollapsed(localStorage.getItem(STORAGE_KEY) === "1"); } catch { /* storage blocked */ }
  }, []);
  const toggle = () => {
    setCollapsed(!collapsed);
    try { localStorage.setItem(STORAGE_KEY, collapsed ? "0" : "1"); } catch { /* storage blocked */ }
  };

  async function signOut() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <div className="min-h-dvh bg-canvas md:flex">
      <Sidebar groups={NAV_GROUPS} collapsed={collapsed} onSignOut={signOut} />
      <div className="min-w-0 flex-1">
        <AppHeader groups={NAV_GROUPS} collapsed={collapsed} onToggle={toggle} />
        <main className="mx-auto w-full min-w-0 max-w-[1600px] px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-6 md:px-10 md:pb-12 md:pt-8">{children}</main>
      </div>
      <MobileNav groups={NAV_GROUPS} onSignOut={signOut} />
    </div>
  );
}
