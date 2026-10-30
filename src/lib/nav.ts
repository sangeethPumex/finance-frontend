import { ArrowsLeftRight, Bank, ChartLineUp, ChartPie, ChartDonut, Calendar, CalendarDots, CreditCard, HandCoins, Lightbulb, SquaresFour, Target, UserCircle, Sparkle, Storefront, Tag, type Icon } from "@phosphor-icons/react";

export type NavLink = { href: string; label: string; icon: Icon; ai?: boolean };
export type NavGroup = { title: string; links: NavLink[] };

/** Sidebar sections, each under a small heading. */
export const NAV_GROUPS: NavGroup[] = [
  { title: "Overview", links: [
    { href: "/", label: "Dashboard", icon: SquaresFour },
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
  { title: "Setup", links: [
    { href: "/categories", label: "Categories", icon: Tag },
    { href: "/vendors", label: "Vendors", icon: Storefront },
    { href: "/profile", label: "About Me", icon: UserCircle },
  ] },
];
