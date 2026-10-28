import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type Account = {
  id: string; name: string; bank: string; last4: string;
  opening_balance_paise: number; opening_at: string; created_at: string; balance_paise: number;
};

export type CardKind = "credit" | "paylater";
export type LinkedEmi = { id: string; name: string; monthly: number; left: number; active: boolean };
/** The account page: balance, this month's flow, a 30-day balance line, top payees, spending by category and the SIPs that debit it. Paise, except SIP amounts (rupees). */
export type AccountDetail = Account & {
  month_start: string; in_paise: number; out_paise: number; month_txns: number; total_txns: number; needs_review: number;
  series: { date: string; paise: number }[];
  top_payees: { name: string; paise: number; count: number }[];
  by_category: { category_id?: string; paise: number }[];
  sips: { name: string; amount: number; day: number; inDays: number; genius?: boolean }[]; sip_monthly: number;
};
/** A credit card or pay-later line. Money is paise; days are of the month (0 or absent when unknown). */
export type Card = {
  id: string; name: string; kind: CardKind; bank?: string; last4?: string;
  limit_paise?: number; billing_day?: number; due_day?: number; outstanding_paise?: number;
  /** Set when this card draws on another card's limit. limit_paise, available and utilisation are then the group's; used_paise stays this card's own. */
  shared_with?: string; shared_with_name?: string; shared_cards: string[]; group_used_paise?: number;
  cycle_start: string; cycle_spent_paise: number; cycle_txns: number;
  linked_emis: LinkedEmi[]; linked_monthly_paise: number; linked_left_paise: number;
  used_paise: number; available_paise?: number; utilisation?: number; days_to_billing?: number; days_to_due?: number;
};
export type CardInput = { name: string; kind: CardKind; bank?: string; last4?: string; limit_paise?: number; billing_day?: number; due_day?: number; outstanding_paise?: number; shared_with?: string };
export type Category = { id: string; name: string };
export type Vendor = { id: string; name: string; category_id?: string; aliases: string[] };
export type Txn = {
  id: string; type: string; amount_paise: number; occurred_at: string; received_at?: string; direction?: "debit" | "credit";
  bank?: string; account_last4?: string; account_id?: string; card_id?: string;
  raw_vendor?: string; upi_id?: string; vendor_id?: string; category_id?: string;
  needs_review: boolean; review_reason?: string; suggested_category_id?: string;
};

export type Summary = {
  spent_paise: number; income_paise: number; review_count: number;
  by_category: { category_id?: string; paise: number }[];
  daily: { date: string; paise: number }[];
};

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: init?.method ?? "GET",
    headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Sign in first");
  }
  const text = await res.text();
  let json: { error?: string } | null = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* plain-text error, e.g. a 404 from an old backend build */ }
  if (!res.ok) throw new Error(json?.error ?? `${path}: request failed (${res.status})`);
  if (text && json === null) throw new Error(`${path}: unexpected response, is the backend up to date?`);
  return json as T;
}

const list = <T,>(key: string, path = `/${key}`) => () => useQuery({ queryKey: [key], queryFn: () => api<T[]>(path) });

export const useAccounts = list<Account>("accounts");
export const useCards = list<Card>("cards");
export const useAccount = (id: string) => useQuery({ queryKey: ["account", id], queryFn: () => api<AccountDetail>(`/accounts/${id}`) });
export const useAccountTxns = (id: string) => useQuery({ queryKey: ["transactions", "account", id], queryFn: () => api<Txn[]>(`/transactions?limit=200&account_id=${id}`) });
export const useCategories = list<Category>("categories");
export const useVendors = list<Vendor>("vendors");
export const useSummary = () => useQuery({ queryKey: ["summary"], queryFn: () => api<Summary>("/summary") });
export const useTransactions = (needsReview?: boolean) =>
  useQuery({
    queryKey: ["transactions", needsReview],
    queryFn: () => api<Txn[]>(`/transactions?limit=100${needsReview ? "&needs_review=true" : ""}`),
  });

/** Runs a write, then refetches everything (accounts balances, transactions and vendors all depend on each other). */
export function useWrite<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries() });
}

// ---- Dashboard: computed by the backend; money here is paise ----
export type Tone = "good" | "bad" | "warn" | "neutral";
export type FlowTone = "income" | "spend" | "discretionary" | "invest" | "gap" | "net";
export type TxnView = { id: string; vendor: string; source: string; at: string; paise: number; credit: boolean };
export type Flow = { id: string; name: string; tone: FlowTone; paise: number; count: number; txns: TxnView[] };
export type Next = { name: string; paise: number; days: number };
export type Dashboard = {
  period: { key: string; from: string; to: string };
  position: { cashPaise: number; accounts: number; netWorthPaise: number; liabilitiesPaise: number; netWorthChangePaise?: number; netWorthChangeSince?: string; investedPaise: number; currentPaise: number; pnlPaise: number; allocation: { name: string; paise: number }[]; usesFunds: boolean };
  cashflow: {
    incomePaise: number; spentPaise: number; investedPaise: number; netPaise: number; savingsRate?: number;
    sources: Flow[]; dests: Flow[]; earlierSpentPaise: number;
    daily: { date: string; paise: number; top?: { vendor: string; category: string; paise: number } }[];
  };
  upcoming: {
    salaryPaise: number; salaryDay: number; daysToSalary: number;
    emiMonthlyPaise: number; emiOutstandingPaise: number; emiActive: number; emiShare: number; emiTone: Tone; nextEmi?: Next;
    sipMonthlyPaise: number; nextSip?: Next;
    monthlyNetPaise: number; monthlyBurnPaise: number; runwayDays?: number; runwayTone: Tone;
    dailyTargetPaise: number; todaySpentPaise: number; dailyTone: Tone; committedDuePaise: number;
    bufferTargetPaise: number; bufferRatio?: number; bufferTone: Tone; avgDailySpendPaise: number;
  };
  recent: TxnView[];
  needsProfile: boolean;
};
export type PeriodKey = "month" | "last" | "3m" | "custom";

const periodQuery = (period: PeriodKey, from: string, to: string) =>
  `period=${period}${period === "custom" ? `&from=${from}&to=${to}` : ""}`;

export const useDashboard = (period: PeriodKey, from: string, to: string) =>
  useQuery({
    queryKey: ["dashboard", period, from, to],
    queryFn: () => api<Dashboard>(`/dashboard?${periodQuery(period, from, to)}`),
    enabled: period !== "custom" || (!!from && !!to),
  });

export type NWPoint = { date: string; netWorthPaise: number; owedPaise?: number; cashPaise?: number; investmentsPaise?: number; changePaise: number };
export type NWRange = "1m" | "3m" | "6m" | "1y";
export type NetWorth = { history: NWPoint[]; method: string; scenarios: { name: string; assumptions: string; points: NWPoint[] }[] };
export const useNetWorth = (range: NWRange) => useQuery({ queryKey: ["networth", range], queryFn: () => api<NetWorth>(`/dashboard/networth?range=${range}`) });

export type SpendDay = { date: string; paise: number; level: 0 | 1 | 2 | 3 | 4; top?: { vendor: string; category: string; paise: number } };
export const useDailySpend = () => useQuery({ queryKey: ["daily-spend"], queryFn: () => api<SpendDay[]>("/dashboard/daily") });

export const fetchAdvice = (period: PeriodKey, from: string, to: string) =>
  api<{ advice: string }>(`/dashboard/advice?${periodQuery(period, from, to)}`);

// ---- EMIs and loans: rupees, as typed ----
export type EmiKind = "loan" | "purchase" | "card";
export type Payment = { id: string; date: string; kind: "emi" | "extra"; amount: number; principal: number; interest: number; fees: number; reduced: number };
export type EmiView = {
  id: string; name: string; kind: EmiKind; amount: number; dueDay: number; total: number; paid: number;
  rate?: number; rateType?: "fixed" | "variable"; rates?: { from: string; rate: number }[]; balance?: number; original?: number; cardId?: string; cardName?: string; payments?: Payment[];
  active: boolean; left: number; instalmentsLeft: number; daysToDue: number; repaid?: number; paidPrincipal: number; paidInterest: number;
};
export type EmiInput = { name: string; kind: EmiKind; amount: number; dueDay: number; total: number; paid: number; rate?: number; rateType?: "fixed" | "variable"; balance?: number; original?: number; cardId?: string };
export type EmiSummary = {
  monthly: number; outstanding: number; activeCount: number; paidSoFar: number; principalPaid: number; interestPaid: number;
  next?: { name: string; amount: number; days: number };
};
export const useEmis = () => useQuery({ queryKey: ["emis"], queryFn: () => api<{ items: EmiView[]; summary: EmiSummary }>("/emis") });
export type LoanRow = { from: string; to: string; paidOn: string; interest: number; emi: number; extra: number; principal: number; closing: number; future: boolean; rate: number; principalPct: number; interestPct: number };
export type LoanTotals = { interest: number; emi: number; extra: number; principal: number };
export type LoanSchedule = {
  available: boolean; rows: LoanRow[]; past: LoanTotals; ahead: LoanTotals; rate: number; rateType: string; rates: { from: string; rate: number }[];
  months: number; clearsOn: string; neverEnds: boolean; note: string;
};
export const useEmiSchedule = (id: string) => useQuery({ queryKey: ["emi-schedule", id], queryFn: () => api<LoanSchedule>(`/emis/${id}/schedule`) });
export const useEmiImpact = (id: string, extra: number) =>
  useQuery({
    queryKey: ["emi-impact", id, extra],
    queryFn: () => api<{ available: boolean; interestSaved?: number; monthsSaved?: number; monthsLeft?: number }>(`/emis/${id}/impact?extra=${extra}`),
    enabled: extra > 0,
  });

// ---- Mutual funds ----
export type FundType = "Equity" | "Debt" | "Metal" | "Foreign";
export type Membership = "Genius" | "Standalone";
export type SipStatus = "active" | "paused" | "cancelled";
export type Sip = { amount: number; day: number; status?: SipStatus };
export type FundView = {
  id: string; code: number; name: string; fundHouse?: string; platform: string; accountId?: string; type: FundType; membership: Membership;
  units: number; avgNav: number; invested: number; nav?: number; navDate?: string; sip?: Sip;
  /** exited: moved out of the portfolio (a Genius rebalance or a redemption); value and pnl are then what it sold for and the realised gain. */
  active: boolean; status?: "exited"; joinedAt?: string; exitedAt?: string; proceeds?: number;
  value: number; pnl: number; returnPct?: number; sipInDays?: number;
};
export type FundInput = { code: number; platform: string; accountId?: string; type: FundType; membership: Membership; units: number; avgNav: number; invested?: number; sip?: Sip; joinedAt?: string };
export type FundSummary = {
  invested: number; value: number; pnl: number; count: number; sipMonthly: number; asOf?: string;
  byType: { name: string; value: number }[]; byPlatform: { name: string; value: number }[];
  nextSip?: { name: string; amount: number; days: number };
  realised: number; exited: number; genius: GeniusSummary;
};
export type GeniusMove = { name: string; kind: "in" | "out"; date: string; amount: number };
export type GeniusSip = Sip & { accountId?: string };
export type GeniusSummary = { sip?: GeniusSip; sipInDays?: number; active: number; value: number; invested: number; pnl: number; exited: number; realised: number; lastRebalance?: string; moves: GeniusMove[] };
export type FundLookup = { code: number; name: string; fundHouse: string; category: string; nav: number; date: string };
export const useFunds = () => useQuery({ queryKey: ["funds"], queryFn: () => api<{ items: FundView[]; summary: FundSummary }>("/funds") });
export const lookupFund = (code: string) => api<FundLookup>(`/funds/lookup/${encodeURIComponent(code.trim())}`);

// ---- Stocks: rupees; the backend computes everything and prices are never stored with a holding ----
export type StockLot = { id: string; symbol: string; quantity: number; buyPrice: number; buyDate: string; platform?: string; value: number; pnl: number; returnPct: number };
export type StockPosition = {
  symbol: string; name?: string; domain?: string; quantity: number; avgPrice: number; invested: number; price?: number; prevClose?: number; asOf?: string;
  value: number; pnl: number; pnlPct: number; dayChange: number; dayPct: number; allocation: number; stale: boolean; lots: StockLot[];
};
export type StockSummary = { invested: number; value: number; pnl: number; pnlPct: number; dayChange: number; dayPct: number; asOf?: string; stale: boolean; unpriced: number };
export type StockInput = { symbol: string; quantity: number; buyPrice: number; buyDate: string; platform?: string };
export const useStocks = () => useQuery({ queryKey: ["stocks"], queryFn: () => api<{ summary: StockSummary; positions: StockPosition[] }>("/stocks") });

/** Runs any backend write, then refetches everything. Success and failure both show a toast. */
export function useAct() {
  const w = useWrite((fn: () => Promise<unknown>) => fn());
  return (fn: () => Promise<unknown>, opts: { ok?: string; onDone?: () => void; onSettled?: () => void } = {}) =>
    w.mutate(fn, {
      onSuccess: () => { if (opts.ok) toast.success(opts.ok); opts.onDone?.(); },
      onSettled: opts.onSettled,
      onError: (e) => toast.error(e instanceof Error ? e.message : "Something went wrong"),
    });
}
