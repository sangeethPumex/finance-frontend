import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type Account = {
  id: string; name: string; bank: string; last4: string;
  opening_balance_paise: number; opening_at: string; created_at: string; balance_paise: number;
};

export type CardKind = "credit" | "paylater";
export type CardNetwork = "visa" | "mastercard" | "rupay" | "amex" | "diners";
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
  id: string; name: string; kind: CardKind; bank?: string; last4?: string; network?: CardNetwork;
  limit_paise?: number; billing_day?: number; due_day?: number; outstanding_paise?: number;
  /** Set when this card draws on another card's limit. limit_paise, available and utilisation are then the group's; used_paise stays this card's own. */
  shared_with?: string; shared_with_name?: string; shared_cards: string[]; group_used_paise?: number;
  cycle_start: string; cycle_spent_paise: number; cycle_txns: number;
  linked_emis: LinkedEmi[]; linked_monthly_paise: number; linked_left_paise: number;
  used_paise: number; available_paise?: number; utilisation?: number; days_to_billing?: number; days_to_due?: number;
  apr?: number; statement?: Statement;
  /** Bill payments linked from transactions: how many, and the latest. */
  payments: number; last_payment_at?: string; last_payment_paise?: number;
};
/** The last closed bill and what is still owed on it (estimated from transactions). */
export type Statement = {
  from: string; to: string; billed_paise: number; paid_paise: number; unpaid_paise: number; min_due_paise: number;
  due_date: string; days_to_due: number; overdue: boolean; remind: boolean; apr: number;
  /** no_due: nothing billed. partial: some paid. overdue: unpaid past the due date. */
  status: "no_due" | "paid" | "partial" | "unpaid" | "overdue";
  interest_if_min_paise: number; interest_if_skipped_paise: number;
};
export type CardInput = { name: string; kind: CardKind; bank?: string; last4?: string; network?: CardNetwork | ""; limit_paise?: number; billing_day?: number; due_day?: number; apr?: number; outstanding_paise?: number; shared_with?: string };
export type Category = { id: string; name: string; icon?: string };
export type Vendor = { id: string; name: string; category_id?: string; aliases: string[] };
export type Txn = {
  id: string; type: string; amount_paise: number; occurred_at: string; received_at?: string; direction?: "debit" | "credit";
  bank?: string; account_last4?: string; account_id?: string; card_id?: string;
  /** The credit card this payment settled (category "Credit card payments"). */
  paid_card_id?: string;
  raw_vendor?: string; upi_id?: string; vendor_id?: string; category_id?: string; ref?: string; note?: string; model?: string;
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
/** A bill payment for a card: a linked bank transaction (a transaction in "Credit card payments") or one recorded by hand, which can be removed. */
export type CardPayment = { id: string; source: "transaction" | "manual"; note?: string; txn_id?: string; at: string; amount_paise: number; account_id?: string; bank?: string; account_last4?: string; payee?: string };
/** One line of a card's history. imported: read from a card statement instead of an SMS. */
export type CardActivity = { id: string; at: string; amount_paise: number; kind: "purchase" | "refund" | "payment"; vendor: string; source?: string; category?: string; imported?: boolean; needs_review?: boolean };
export const useCardActivity = (id: string, limit = 8) => useQuery({ queryKey: ["cards", "activity", id, limit], queryFn: () => api<CardActivity[]>(`/cards/${id}/activity?limit=${limit}`) });
export const useCardPayments = (id: string) => useQuery({ queryKey: ["cards", "payments", id], queryFn: () => api<CardPayment[]>(`/cards/${id}/payments`) });
export const useCards = list<Card>("cards");
export const useAccount = (id: string) => useQuery({ queryKey: ["account", id], queryFn: () => api<AccountDetail>(`/accounts/${id}`) });
export const useAccountTxns = (id: string) => useQuery({ queryKey: ["transactions", "account", id], queryFn: () => api<Txn[]>(`/transactions?limit=200&account_id=${id}`) });
export const useCategories = list<Category>("categories");
export const useVendors = list<Vendor>("vendors");
/** Money someone owes that no bank payment backs (a GPay group, cash lent). paid_at is set once it is paid. */
export type Debt = { id: string; person: string; group?: string; source: string; note?: string; amount_paise: number; paid_at?: string; created_at: string };
export const useDebts = list<Debt>("debts");

/** A paged list request (POST .../search). Filter keys are per list; blanks are dropped before sending. */
export type Sort = { field: string; dir: "asc" | "desc" };
export type PageReq = { page: number; limit: number; search?: string; sort?: Sort; filter?: Record<string, string> };
export type Paged<T> = { items: T[]; page: number; limit: number; total: number; pages: number };
const clean = (r: PageReq): PageReq => ({ ...r, search: r.search?.trim() || undefined, filter: Object.fromEntries(Object.entries(r.filter ?? {}).filter(([, v]) => v)) });
const paged = <T,>(key: string) => (req: PageReq) =>
  useQuery({
    queryKey: [key, "page", req],
    queryFn: () => api<Paged<T>>(`/${key}/search`, { method: "POST", body: clean(req) }),
    placeholderData: (prev) => prev, // keep the old rows on screen while the next page or a search loads
  });
/** One page of vendors or categories: search, sort and filter all happen on the server. */
export const useVendorsPage = paged<Vendor>("vendors");
export const useCategoriesPage = paged<Category>("categories");
export type BudgetStatus = { id: string; category_id: string; limit_paise: number; spent_paise: number; ratio: number; level: "ok" | "warn" | "over" };
export const useBudgets = () => useQuery({ queryKey: ["budgets"], queryFn: () => api<BudgetStatus[]>("/budgets") });

export type SavedView = { id: string; name: string; filter: Record<string, string> };
export const useViews = list<SavedView>("views");

export type Recurring = {
  name: string; vendor_id?: string; category_id?: string; cadence: "weekly" | "monthly" | "quarterly" | "yearly";
  amount_paise: number; last_paise: number; monthly_paise: number; count: number; last_at: string; next_at: string; days_until: number; status: "active" | "lapsed";
};
export type Anomaly = { txn_id: string; vendor: string; at: string; paise: number; usual_paise: number; ratio: number; kind: "spike" | "new_vendor" };
export type Bucket = { paise: number; count: number };
/** Weekdays run Sunday first; hours are 0-23 in IST. Notes are plain-language observations from the backend. */
export type Patterns = { weekdays: Bucket[]; hours: Bucket[]; notes: string[] };
export type Pace = { month_paise: number; prev_span_paise: number; prev_month_paise: number; projected_paise: number; daily_avg_paise: number; day: number; days_in_month: number };
/** A category's spend this month so far against the same days last month. */
export type Mover = { category_id?: string; name: string; paise: number; prev_paise: number };
export type TopVendor = { name: string; paise: number; count: number };
export type Insights = { recurring: Recurring[]; monthly_paise: number; anomalies: Anomaly[]; patterns: Patterns; pace: Pace; movers: Mover[]; top_vendors: TopVendor[] };
export const useInsights = () => useQuery({ queryKey: ["insights"], queryFn: () => api<Insights>("/insights") });
export const usePatterns = () => useQuery({ queryKey: ["patterns"], queryFn: () => api<Patterns>("/insights/patterns") });

export const useSummary = () => useQuery({ queryKey: ["summary"], queryFn: () => api<Summary>("/summary") });
/** Narrows the transaction list; blanks are ignored. Dates are YYYY-MM-DD, min and max are rupees. */
export type TxnFilter = Partial<Record<"q" | "category_id" | "account_id" | "card_id" | "direction" | "from" | "to" | "min" | "max" | "status", string> & { needs_review: boolean; owed: boolean }>;
export const useTransactions = (f: TxnFilter = {}, limit = 100) =>
  useQuery({
    queryKey: ["transactions", f, limit],
    queryFn: () => api<Txn[]>(`/transactions?${new URLSearchParams([["limit", String(limit)], ...Object.entries(f).filter(([, v]) => v).map(([k, v]) => [k, String(v)])])}`),
    placeholderData: (prev) => prev, // keep the old rows while a typed search loads
  });

export type TxnPage = Paged<Txn>;
/** One page of the filtered list (POST /transactions/search). status: review | uncategorised | attention. min and max are rupees. sort.field: date | amount | vendor | type. */
export const useTransactionsPage = (f: TxnFilter, page: number, limit = 50, sort?: Sort) =>
  useQuery({
    queryKey: ["transactions", "page", f, page, limit, sort],
    queryFn: () => api<TxnPage>("/transactions/search", { method: "POST", body: { page, limit, sort, filter: Object.fromEntries(Object.entries(f).filter(([, v]) => v)) } }),
    placeholderData: (prev) => prev, // keep the old rows while the next page or a typed search loads
  });

/** What a vendor or category change can alter: names and categories show on transactions, and spend totals follow categories. */
export const NAME_KEYS = ["vendors", "categories", "transactions", "summary", "budgets", "dashboard", "insights", "accounts", "copilot"];
/** What a change to one transaction can alter (not balances: a category never moves money). */
export const TXN_KEYS = ["transactions", "summary", "budgets", "dashboard", "insights", "account", "cards", "copilot"];

/**
 * Runs a write, then refetches what it can have changed. keys are query-key prefixes; leave them out to refetch everything (accounts
 * balances, transactions and vendors all depend on each other). Only queries on screen refetch now; the rest are just marked stale.
 */
export function useWrite<V>(fn: (v: V) => Promise<unknown>, keys?: string[]) {
  const qc = useQueryClient();
  // The refetch runs in the background (not returned), so the caller sees "done" as soon as the server has answered; a failure refetches to undo any optimistic edit.
  const refresh = () => { void (keys ? Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: [k] }))) : qc.invalidateQueries()); };
  return useMutation({ mutationFn: fn, onSuccess: refresh, onError: refresh });
}

/** Edits a cached list (key "vendors", "categories", ...) at once, before the server has answered, in the plain list and in every cached page; a failed write refetches and undoes it. */
export function useListCache<T>(key: string) {
  const qc = useQueryClient();
  return (fn: (rows: T[]) => T[]) =>
    qc.setQueriesData<T[] | Paged<T>>({ queryKey: [key] }, (d) => (Array.isArray(d) ? fn(d) : d && "items" in d ? { ...d, items: fn(d.items) } : d));
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
export type FlowTone = "income" | "spend" | "discretionary" | "invest" | "gap" | "net" | "card";
export type TxnView = { id: string; vendor: string; source: string; at: string; paise: number; credit: boolean };
export type Flow = { id: string; name: string; tone: FlowTone; paise: number; count: number; txns: TxnView[] };
export type Next = { name: string; paise: number; days: number };
export type Dashboard = {
  period: { key: string; from: string; to: string };
  position: { cashPaise: number; accounts: number; netWorthPaise: number; liabilitiesPaise: number; netWorthChangePaise?: number; netWorthChangeSince?: string; investedPaise: number; currentPaise: number; pnlPaise: number; allocation: { name: string; paise: number }[]; usesFunds: boolean };
  cashflow: {
    incomePaise: number; spentPaise: number; investedPaise: number; netPaise: number; savingsRate?: number;
    sources: Flow[]; dests: Flow[]; earlierSpentPaise: number;
    /** Bill payments in the period; already counted in spending, so shown beside the chart and left out of every total. */
    cardPayments?: Flow;
    daily: { date: string; paise: number; top?: { vendor: string; category: string; paise: number } }[];
  };
  upcoming: {
    salaryPaise: number; salaryDay: number; daysToSalary: number;
    emiMonthlyPaise: number; emiOutstandingPaise: number; emiActive: number; emiShare: number; emiTone: Tone; nextEmi?: Next;
    sipMonthlyPaise: number; nextSip?: Next;
    monthlyNetPaise: number; monthlyBurnPaise: number; runwayDays?: number; runwayTone: Tone;
    stopBurnPaise: number; runwayCashDays?: number; runwayWorthDays?: number;
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

/** One day of the snapshot table (paise). Past days built from transactions value holdings at cost (valuation "cost"); live days at market. */
export type DailySnapshot = {
  date: string; accounts: { id: string; name: string; bank: string; last4: string; paise: number }[]; cashPaise: number;
  stocks: { investedPaise: number; valuePaise: number }; mutualFunds: { investedPaise: number; valuePaise: number }; other: { investedPaise: number; valuePaise: number };
  investedPaise: number; investmentsPaise: number; netWorthPaise: number; owedPaise?: number; cardUsedPaise?: number;
  spentPaise: number; spentMonthPaise: number; spendTxns: number; incomePaise: number; cardPaymentsPaise: number;
  valuation: "market" | "cost"; source: "live" | "backfill"; updatedAt: string;
};
/** Daily snapshots from..to (YYYY-MM-DD), oldest first; the last 30 days when left out. */
export const useSnapshots = (from?: string, to?: string) =>
  useQuery({ queryKey: ["snapshots", from, to], queryFn: () => api<DailySnapshot[]>(`/snapshots${from || to ? `?${new URLSearchParams({ ...(from && { from }), ...(to && { to }) })}` : ""}`), staleTime: 60_000 });

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
  /** Payment check for the latest due date that has arrived; absent when none is recent. txn_id is the matching or linked transaction. */
  last_due?: string; status?: "paid" | "unpaid"; txn_id?: string;
};
export type MandateOcc = { id: string; name: string; paise: number; date: string; days: number };
export type MandatePlan = { items: Mandate[]; calendar: MandateOcc[]; next30_paise: number; next90_paise: number; year_paise: number; set_aside_paise: number };
export type MandateSuggestion = Omit<MandateInput, "account_id" | "category_id"> & { count: number };
/** Parses every message still waiting or failed, one request each; a failure doesn't stop the rest, and the first error is thrown at the end. Returns how many parsed. */
export async function parseUnparsed() {
  const ids = await api<string[]>("/raw-transactions/unparsed");
  let done = 0, firstErr: unknown;
  for (const id of ids) {
    try { await api(`/raw-transactions/${id}/parse`, { method: "POST" }); done++; } catch (e) { firstErr ??= e; }
  }
  if (firstErr) throw new Error(`Parsed ${done} of ${ids.length}: ${firstErr instanceof Error ? firstErr.message : firstErr}`);
  return done;
}
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

/** Runs any backend write, then refetches what keys name (everything when left out). Success and failure both show a toast. */
export function useAct(keys?: string[]) {
  const w = useWrite((fn: () => Promise<unknown>) => fn(), keys);
  return (fn: () => Promise<unknown>, opts: { ok?: string; onDone?: () => void; onSettled?: () => void } = {}) =>
    w.mutate(fn, {
      onSuccess: () => { if (opts.ok) toast.success(opts.ok); opts.onDone?.(); },
      onSettled: opts.onSettled,
      onError: (e) => toast.error(e instanceof Error ? e.message : "Something went wrong"),
    });
}

export type AllocSlice = { class: "equity" | "debt" | "gold" | "cash"; value: number; pct: number; target?: number; drift?: number; shift?: number };
export type Target = { equity: number; debt: number; gold: number; cash: number };
export type Return = { key: string; name: string; rate?: number; exact: boolean };
export type SipCheck = { name: string; amount: number; day: number; state: "ok" | "due" | "missed" | "paused"; lastLogged?: string; stepUp: "up" | "none" | "new" | ""; stepUpPct?: number };
export type PortfolioOverview = {
  allocation: { total: number; slices: AllocSlice[] };
  target?: Target;
  returns: { portfolio?: number; funds: Return[]; stocks: Return[] };
  sips: SipCheck[];
};
export const usePortfolio = () => useQuery({ queryKey: ["portfolio"], queryFn: () => api<PortfolioOverview>("/portfolio") });

export type IncomeEntry = { id: string; date: string; kind: "dividend" | "interest"; source: string; amount: number };
export type Income = { fy: string; dividend: number; interest: number; lastFy: number; months: { ym: string; dividend: number; interest: number }[]; entries: IncomeEntry[] };
export const useIncome = () => useQuery({ queryKey: ["income"], queryFn: () => api<Income>("/portfolio/income") });

export type PriceAlert = { id: string; kind: "stock" | "fund"; ref: string; name: string; op: "above" | "below"; price: number; createdAt: string; triggeredAt?: string; triggeredPrice?: number; current?: number };
export const useAlerts = () => useQuery({ queryKey: ["alerts"], queryFn: () => api<PriceAlert[]>("/alerts"), refetchInterval: 5 * 60_000 });

// ---- Brain Jogger: shopping lists and reminders ----
export type JoggerKind = "shopping" | "reminder";
export type JoggerItem = { id: string; name: string; est_paise: number; bought: boolean };
export type JoggerList = { id: string; title: string; kind: JoggerKind; note?: string; remind_at: string; lead_mins: number[]; items: JoggerItem[]; created_at: string };
/** Body of a create or update; remind_at is an ISO timestamp. Items without an id are new. */
export type JoggerInput = { title: string; kind: JoggerKind; note?: string; remind_at: string; lead_mins: number[]; items: { id?: string; name: string; est_paise: number; bought?: boolean }[] };
export const useJogger = () => useQuery({ queryKey: ["jogger"], queryFn: () => api<JoggerList[]>("/jogger"), refetchInterval: 60_000 });

// ---- Vehicles: money is paise, dates are YYYY-MM-DD (IST), mileage is km per litre (per kWh for an electric) ----
export type VehicleKind = "car" | "bike";
export type FuelType = "petrol" | "diesel" | "cng" | "electric";
export type LogKind = "fuel" | "service" | "repair" | "parts" | "wash" | "toll" | "parking" | "fine" | "trip" | "other";
export type DocKind = "insurance" | "rc" | "puc" | "service" | "receipt" | "other";
/** comprehensive: own damage and third party. third_party: the legal minimum. own_damage: first-party cover on its own. */
export type InsuranceType = "comprehensive" | "third_party" | "own_damage";
export type Insurance = { type?: InsuranceType; insurer?: string; policy_no?: string; expires?: string; premium_paise?: number; idv_paise?: number };
export type VehicleInput = {
  kind: VehicleKind; name: string; make?: string; model?: string; year?: number; plate: string; fuel: FuelType;
  tank_litres?: number; claimed_kmpl?: number; odometer_km?: number; insurance: Insurance; puc_expires?: string; service_km?: number; service_months?: number;
  /** The service schedule runs from bought_on until a service is logged; service_planned is a booked date, which wins. */
  bought_on?: string; service_planned?: string;
};
export type VehicleDoc = { id: string; kind: DocKind; name: string; type: string; size: number; at: string };
export type VehicleLog = {
  id: string; kind: LogKind; date: string; odometer_km?: number; amount_paise: number; litres?: number; full_tank?: boolean;
  place?: string; from?: string; trip_km?: number; note?: string; txn_id?: string;
};
export type VehicleReminder = { kind: "insurance" | "puc" | "service"; title: string; date: string; days: number; tone: "good" | "warn" | "bad" };
export type VehicleStats = {
  odometer_km: number; avg_kmpl?: number; last_kmpl?: number; best_kmpl?: number; price_per_l?: number; km_per_month?: number; range_km?: number;
  fills: { date: string; km: number; litres: number; kmpl: number; price_per_l: number }[];
  fuel_per_km_paise?: number; run_per_km_paise?: number; total_paise: number; month_paise: number; year_paise: number;
  by_kind: { kind: LogKind; paise: number; count: number }[];
  months: { month: string; fuel_paise: number; other_paise: number; litres: number }[];
  next_month_fuel_paise?: number; next_year_paise?: number;
  /** due_date is planned when one is booked, else suggested (the maker's schedule). */
  next_service?: { due_km?: number; km_left?: number; due_date: string; suggested?: string; planned?: string; days: number; last?: string };
  reminders: VehicleReminder[]; trips: number; trip_km: number;
};
export type Vehicle = VehicleInput & { id: string; photo?: string; docs: VehicleDoc[]; created_at: string; stats: VehicleStats };
export type VehicleDetail = Vehicle & { logs: VehicleLog[] };
/** A recent bank debit that looks like fuel, a toll or upkeep, not yet logged against any vehicle. */
export type VehicleSuggestion = { txn_id: string; date: string; vendor: string; amount_paise: number; kind: LogKind };
export const useVehicles = list<Vehicle>("vehicles");
export const useVehicle = (id: string) => useQuery({ queryKey: ["vehicles", id], queryFn: () => api<VehicleDetail>(`/vehicles/${id}`) });
export const useVehicleSuggestions = () => useQuery({ queryKey: ["vehicles", "suggestions"], queryFn: () => api<VehicleSuggestion[]>("/vehicles/suggestions") });
/** Where a vehicle's photo or paper is served from; v changes with each new photo so the browser does not show a stale one. */
export const vehicleFileUrl = (id: string, file: string, v?: string) => `/api/vehicles/${id}/files/${file}${v ? `?v=${encodeURIComponent(v)}` : ""}`;
/** Sends a file as the raw body; the backend stores it in the bucket under vehicles/{id}/{kind}/. */
export async function uploadVehicleFile(id: string, kind: DocKind | "photo", file: File) {
  const res = await fetch(`/api/vehicles/${id}/files?kind=${kind}&name=${encodeURIComponent(file.name)}`, { method: "POST", headers: { "Content-Type": file.type }, body: file });
  if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? `Upload failed (${res.status})`);
}

// ---- Copilot: what to do now. Computed by the backend; money here is paise, runway is days ----
export type CopilotEvent = { offset: number; date: string; name: string; paise: number; kind: "salary" | "mandate" | "emi" | "sip" | "card" | "renewal"; count?: number };
export type CopilotMode = { key: string; label: string; months: number; floorPct: number };
export type Safe = {
  todayPaise: number; spentPaise: number; leftPaise: number; tomorrowPaise: number; ratio: number; tone: "good" | "warn" | "bad";
  cashPaise: number; committedPaise: number; fixedPaise: number; bufferPaise: number; committed: CopilotEvent[];
  mode: CopilotMode; modes: CopilotMode[]; goalPaise: number; onFloor: boolean; shortPaise: number; sustainDays: number;
};
export type Week = { days: number; inPaise: number; outPaise: number; events: CopilotEvent[]; lowestPaise: number; lowestDate: string; aboveBuffer: boolean; safePerDayPaise: number; priciest?: string };
export type Advice = { kind: "timing" | "utilisation" | "payoff"; card: string; title: string; body: string; stakePaise: number };
export type Subscription = { name: string; cadence: string; amountPaise: number; yearlyPaise: number; runwayDaysPerMonth: number; raisedPaise?: number; daysUntil: number };
export type Nudge = { id: string; kind: string; title: string; body: string; tone: "good" | "warn" | "bad" | "info"; actionLabel?: string; actionHref?: string; ref?: string; stakePaise: number; state: "new" | "dismissed" | "acted"; createdAt: string };
export type CopilotOverview = {
  safe: Safe;
  runway: { days: number; burnDailyPaise: number; zeroDate?: string; goalDays: number; recapDays: number; recapText?: string };
  week: Week;
  habits: { noSpendStreak: number; underStreak: number; priciestDay?: string; weekendRatio: number; afterSalaryRatio: number; notes: string[] };
  confidence: { accountsSeen: number; accountsTotal: number; notes: string[] };
  cardAdvice: Advice[]; subscriptions: Subscription[]; top?: Nudge; owedPaise: number;
};
export type CheckInput = { name?: string; amountPaise: number; need?: boolean; uses?: number; replacesPaise?: number; onCard?: boolean; date?: string };
export type CheckResult = {
  name?: string; amountPaise: number; verdict: "buy" | "wait" | "skip"; headline: string; runwayBefore: number; runwayAfter: number; runwayCost: number;
  safeBeforePaise: number; safeAfterPaise: number; planCost: string; earliest?: string; reasons: string[];
  scenarios: { label: string; date: string; runwayAfter: number; safePerDayPaise: number; uncovered?: string; interestPaise: number; shortPaise: number; passes: boolean }[];
  coolOff: string; savePerDayPaise: number; saveBy: string; costPerUsePaise?: number; paybackMonths?: number;
  emi: { months: number; ratePct: number; feePct: number; extraPaise: number; monthlyPaise: number };
};
export type Want = { id: string; name: string; amountPaise: number; need: boolean; uses: number; link?: string; remindAt?: string; status: "parked" | "bought" | "dropped"; boughtAt?: string; glad?: boolean; createdAt: string; check?: CheckResult };
export type Inbox = { active: Nudge[]; history: Nudge[]; muted: { kind: string; label: string; auto?: boolean }[] };
export const useCopilot = () => useQuery({ queryKey: ["copilot"], queryFn: () => api<CopilotOverview>("/copilot"), staleTime: 60_000 });
export const useNudges = () => useQuery({ queryKey: ["copilot-nudges"], queryFn: () => api<Inbox>("/copilot/nudges"), refetchInterval: 5 * 60_000 });
export const useCopilotWants = () => useQuery({ queryKey: ["copilot-wants"], queryFn: () => api<Want[]>("/copilot/wants") });
export const useCopilotCheck = () => useMutation({ mutationFn: (body: CheckInput) => api<CheckResult>("/copilot/check", { method: "POST", body }) });
