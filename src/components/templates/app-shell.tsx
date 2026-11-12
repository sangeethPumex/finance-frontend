"use client";

import { useEffect, useState } from "react";
import { SPACES, type SpaceKey } from "@/lib/nav";
import { AppHeader, MobileNav, Sidebar } from "../organisms";

const STORAGE_KEY = "catalyst.nav";

/** Sidebar and header around the scrolling content area. */
export function AppShell({ children, space = "personal" }: { children: React.ReactNode; space?: SpaceKey }) {
  const { groups, home, primary } = SPACES[space];
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
    <div data-space={space} className="min-h-dvh bg-canvas md:flex">
      <Sidebar groups={groups} home={home} collapsed={collapsed} onSignOut={signOut} />
      <div className="min-w-0 flex-1">
        <AppHeader groups={groups} home={home} rootLabel={space === "household" ? "Household" : "Catalyst"} collapsed={collapsed} onToggle={toggle} />
        <main className="mx-auto w-full min-w-0 max-w-[1600px] px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-6 md:px-10 md:pb-12 md:pt-8">{children}</main>
      </div>
      <MobileNav groups={groups} home={home} primary={primary} onSignOut={signOut} />
    </div>
  );
}
