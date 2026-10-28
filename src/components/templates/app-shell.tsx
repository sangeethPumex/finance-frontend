"use client";

import { NAV_GROUPS } from "@/lib/nav";
import { MobileNav, Sidebar } from "../organisms";

/** Sidebar plus the scrolling content area. */
export function AppShell({ children }: { children: React.ReactNode }) {
  async function signOut() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <div className="min-h-dvh md:flex">
      <Sidebar groups={NAV_GROUPS} onSignOut={signOut} />
      <main className="mx-auto w-full min-w-0 max-w-[1600px] px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-6 md:px-10 md:py-12">{children}</main>
      <MobileNav groups={NAV_GROUPS} onSignOut={signOut} />
    </div>
  );
}
