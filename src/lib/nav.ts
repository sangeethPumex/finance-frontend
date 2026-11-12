import { ArrowsLeftRight, ListChecks, Bank, Car,ChartLineUp, ChartPie, ChartDonut, Calendar, CalendarDots, Compass, CreditCard, House, HandCoins, Lightbulb, SquaresFour, Target, UserCircle, Sparkle, Storefront, Tag, type Icon } from "@phosphor-icons/react";

export type NavLink = { href: string; label: string; icon: Icon; ai?: boolean };
export type NavGroup = { title: string; links: NavLink[] };

/** Sidebar sections, each under a small heading. */
export const NAV_GROUPS: NavGroup[] = [
  { title: "Overview", links: [
    { href: "/personal-finance", label: "Dashboard", icon: SquaresFour },
    { href: "/copilot", label: "Copilot", icon: Compass },
    { href: "/insights", label: "Insights", icon: Lightbulb },
    { href: "/ai", label: "AI Expert", icon: Sparkle, ai: true },
  ] },
  { title: "Money", links: [
    { href: "/accounts", label: "Accounts", icon: Bank },
    { href: "/transactions", label: "Transactions", icon: ArrowsLeftRight },
    { href: "/budgets", label: "Budgets", icon: Target },
    { href: "/cards", label: "Credit Cards", icon: CreditCard },
  ] },
  { title: "Commitments", links: [
    { href: "/mandates", label: "Mandates", icon: CalendarDots },
    { href: "/emis", label: "EMIs", icon: Calendar },
    { href: "/owed", label: "Owed to Me", icon: HandCoins },
  ] },
  { title: "Investments", links: [
    { href: "/portfolio", label: "Portfolio", icon: ChartDonut },
    { href: "/funds", label: "Mutual Funds", icon: ChartPie },
    { href: "/stocks", label: "Stocks", icon: ChartLineUp },
  ] },
  { title: "Garage", links: [
    { href: "/vehicles", label: "Vehicles", icon: Car },
  ] },
  { title: "Brain Jogger", links: [
    { href: "/jogger", label: "Lists & Reminders", icon: ListChecks },
  ] },
  { title: "Setup", links: [
    { href: "/categories", label: "Categories", icon: Tag },
    { href: "/vendors", label: "Vendors", icon: Storefront },
    { href: "/profile", label: "About Me", icon: UserCircle },
  ] },
];

const HOUSEHOLD_GROUPS: NavGroup[] = [
  { title: "Overview", links: [{ href: "/household", label: "Dashboard", icon: SquaresFour }] },
  { title: "Home money", links: [
    { href: "/household/budgets", label: "Budgets", icon: Target },
    { href: "/household/bills", label: "Bills", icon: CalendarDots },
    { href: "/household/emis", label: "EMIs", icon: Calendar },
    { href: "/household/owed", label: "Owed to Us", icon: HandCoins },
  ] },
  { title: "Garage", links: [{ href: "/household/vehicles", label: "Vehicles", icon: Car }] },
];

/** A product space: its menu, its root page (active only on an exact match) and the four tabs shown on a phone. */
export type SpaceKey = "personal" | "household";
export const SPACES: Record<SpaceKey, { groups: NavGroup[]; home: string; primary: string[]; icon: Icon }> = {
  personal: { groups: NAV_GROUPS, home: "/personal-finance", primary: ["/personal-finance", "/accounts", "/emis", "/transactions"], icon: UserCircle },
  household: { groups: HOUSEHOLD_GROUPS, home: "/household", primary: ["/household", "/household/budgets", "/household/bills", "/household/owed"], icon: House },
};
