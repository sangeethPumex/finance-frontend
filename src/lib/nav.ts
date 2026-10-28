import { ArrowsLeftRight, Bank, ChartLineUp, ChartPie, Calendar, CreditCard, SquaresFour, UserCircle, Sparkle, Storefront, Tag, type Icon } from "@phosphor-icons/react";

export type NavLink = { href: string; label: string; icon: Icon; ai?: boolean };

/** Two groups split by a divider: money views, then the lookups behind them. */
export const NAV_GROUPS: NavLink[][] = [
  [
    { href: "/", label: "Dashboard", icon: SquaresFour },
    { href: "/accounts", label: "Accounts", icon: Bank },
    { href: "/funds", label: "Mutual Funds", icon: ChartPie },
    { href: "/stocks", label: "Stocks", icon: ChartLineUp },
    { href: "/emis", label: "EMIs", icon: Calendar },
    { href: "/cards", label: "Credit Cards", icon: CreditCard },
    { href: "/ai", label: "AI Expert", icon: Sparkle, ai: true },
    { href: "/profile", label: "About Me", icon: UserCircle },
    { href: "/transactions", label: "Transactions", icon: ArrowsLeftRight },
  ],
  [
    { href: "/categories", label: "Categories", icon: Tag },
    { href: "/vendors", label: "Vendors", icon: Storefront },
  ],
];
