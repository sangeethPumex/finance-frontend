import { AppShell } from "@/components/templates";

export default function HouseholdLayout({ children }: { children: React.ReactNode }) {
  return <AppShell space="household">{children}</AppShell>;
}
