import { AppShell } from "@/components/templates";

/** Grocery & Pantry is its own space: own sidebar, own pink theme. */
export default function PantryLayout({ children }: { children: React.ReactNode }) {
  return <AppShell space="pantry">{children}</AppShell>;
}
