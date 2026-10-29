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
  apr?: number; statement?: Statement;
};
/** The last closed bill and what is still owed on it (estimated from transactions). */
export type Statement = {
  from: string; to: string; billed_paise: number; paid_paise: number; unpaid_paise: number; min_due_paise: number;
  due_date: string; days_to_due: number; overdue: boolean; remind: boolean; apr: number;
  interest_if_min_paise: number; interest_if_skipped_paise: number;
};
export type CardInput = { name: string; kind: CardKind; bank?: string; last4?: string; limit_paise?: number; billing_day?: number; due_day?: number; apr?: number; outstanding_paise?: number; shared_with?: string };
export type Category = { id: string; name: string };
export type Vendor = { id: string; name: string; category_id?: string; aliases: string[] };
export type Txn = {
  id: string; type: string; amount_paise: number; occurred_at: string; received_at?: string; direction?: "debit" | "credit";
  bank?: string; account_last4?: string; account_id?: string; card_id?: string;
  /** The credit card this payment settled (category "Credit card payments"). */
  paid_card_id?: string;
  raw_vendor?: string; upi_id?: string; vendor_id?: string; category_id?: string;
  /** Paid for someone else: how much of this payment they owe back, and how much has come back. Not counted as the user's spend. */
  owed_from?: string; owed_paise?: number; repaid_paise?: number;
  /** One payment spread over several categories; the parts add up to amount_paise. */
  splits?: { category_id: string; paise: number }[];
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
export type BudgetStatus = { id: string; category_id: string; limit_paise: number; spent_paise: number; ratio: number; level: "ok" | "warn" | "over" };
export const useBudgets = () => useQuery({ queryKey: ["budgets"], queryFn: () => api<BudgetStatus[]>("/budgets") });

export type SavedView = { id: string; name: string; filter: Record<string, string> };
export const useViews = list<SavedView>("views");

export type Recurring = {
  name: string; vendor_id?: string; category_id?: string; cadence: "weekly" | "monthly" | "quarterly" | "yearly";
  amount_paise: number; monthly_paise: number; count: number; last_at: string; next_at: string; days_until: number; status: "active" | "lapsed";
};
export type Anomaly = { txn_id: string; vendor: string; at: string; paise: number; usual_paise: number; ratio: number; kind: "spike" | "new_vendor" };
export type Bucket = { paise: number; count: number };
/** Weekdays run Sunday first; hours are 0-23 in IST. Notes are plain-language observations from the backend. */
export type Patterns = { weekdays: Bucket[]; hours: Bucket[]; notes: string[] };
export type Insights = { recurring: Recurring[]; monthly_paise: number; anomalies: Anomaly[]; patterns: Patterns };
export const useInsights = () => useQuery({ queryKey: ["insights"], queryFn: () => api<Insights>("/insights") });
export const usePatterns = () => useQuery({ queryKey: ["patterns"], queryFn: () => api<Patterns>("/insights/patterns") });

export const useSummary = () => useQuery({ queryKey: ["summary"], queryFn: () => api<Summary>("/summary") });
/** Narrows the transaction list; blanks are ignored. Dates are YYYY-MM-DD, min and max are rupees. */
export type TxnFilter = Partial<Record<"q" | "category_id" | "account_id" | "direction" | "from" | "to" | "min" | "max" | "status", string> & { needs_review: boolean; owed: boolean }>;
export const useTransactions = (f: TxnFilter = {}, limit = 100) =>
  useQuery({
    queryKey: ["transactions", f, limit],
    queryFn: () => api<Txn[]>(`/transactions?${new URLSearchParams([["limit", String(limit)], ...Object.entries(f).filter(([, v]) => v).map(([k, v]) => [k, String(v)])])}`),
    placeholderData: (prev) => prev, // keep the old rows while a typed search loads
  });

export type TxnPage = { items: Txn[]; page: number; limit: number; total: number; pages: number };
/** One page of the filtered list (POST /transactions/search). status: review | uncategorised | attention. min and max are rupees. */
export const useTransactionsPage = (f: TxnFilter, page: number, limit = 50) =>
  useQuery({
    queryKey: ["transactions", "page", f, page, limit],
    queryFn: () => api<TxnPage>("/transactions/search", { method: "POST", body: { page, limit, filter: Object.fromEntries(Object.entries(f).filter(([, v]) => v)) } }),
    placeholderData: (prev) => prev, // keep the old rows while the next page or a typed search loads
  });

/** Runs a write, then refetches everything (accounts balances, transactions and vendors all depend on each other). */
export function useWrite<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  // The refetch runs in the background (not returned), so the caller sees "done" as soon as the server has answered; a failure refetches to undo any optimistic edit.
  return useMutation({ mutationFn: fn, onSuccess: () => { void qc.invalidateQueries(); }, onError: () => { void qc.invalidateQueries(); } });
}

/** Edits a cached list (key "vendors", "categories", ...) at once, before the server has answered; a failed write refetches and undoes it. */
export function useListCache<T>(key: string) {
  const qc = useQueryClient();
  return (fn: (rows: T[]) => T[]) => qc.setQueryData<T[]>([key], (d) => (d ? fn(d) : d));
}

/** Shows an edit to one transaction at once, in every cached list (paged or plain), before the server has answered. */
export function useTxnCache() {
  const qc = useQueryClient();
  return (id: string, changes: Partial<Txn>) => {
    const apply = (t: Txn) => (t.id === id ? { ...t, ...changes } : t);
    qc.setQueriesData<Txn[] | TxnPage>({ queryKey: ["transactions"] }, (d) => (Array.isArray(d) ? d.map(apply) : d && "items" in d ? { ...d, items: d.items.map(apply) } : d));
  };
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
  /** What falls due in the next 90 days (see Mandates). */
  owedToYouPaise: number;
  mandates: { next30Paise: number; next90Paise: number; setAsidePaise: number; due: MandateOcc[] };
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

export type Strategy = {
  method: "scheduled" | "avalanche" | "snowball"; months: number; interest: number; neverEnds: boolean;
  order: { name: string; month: number }[]; interestSaved: number; monthsSaved: number;
};
export type PayoffPlan = { extra: number; debts: { id: string; name: string; balance: number; rate: number; min: number }[]; strategies: Strategy[] };
export const usePayoffPlan = (extra: number) =>
  useQuery({ queryKey: ["emi-payoff", extra], queryFn: () => api<PayoffPlan>(`/emis/payoff?extra=${extra}`), placeholderData: (p) => p });

// ---- Mandates: payments that must be made; money is paise, dates are YYYY-MM-DD (IST) ----
export type Frequency = "monthly" | "quarterly" | "yearly" | "one-off";
export type MandateInput = { name: string; amount_paise: number; frequency: Frequency; next_due: string; account_id?: string; category_id?: string };
export type Mandate = Required<Pick<MandateInput, "name" | "amount_paise" | "frequency" | "next_due">> & {
  id: string; account_id?: string; category_id?: string;
  /** The next date it falls due from today; absent for a one-off that has passed. */
  next?: string; days: number; set_aside_paise: number;
};
export type MandateOcc = { id: string; name: string; paise: number; date: string; days: number };
export type MandatePlan = { items: Mandate[]; calendar: MandateOcc[]; next30_paise: number; next90_paise: number; year_paise: number; set_aside_paise: number };
export type MandateSuggestion = Omit<MandateInput, "account_id" | "category_id"> & { count: number };
export const useMandates = () => useQuery({ queryKey: ["mandates"], queryFn: () => api<MandatePlan>("/mandates") });
export const useMandateSuggestions = () => useQuery({ queryKey: ["mandate-suggestions"], queryFn: () => api<MandateSuggestion[]>("/mandates/suggestions") });

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
