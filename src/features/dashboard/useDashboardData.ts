import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import type { SpendTrendPoint } from './SpendTrendChart';

/*
 * Response shapes below are taken from the reference app's HomePage.jsx data
 * load (the Promise.all over /summary/dashboard, /recommendations,
 * /smart-alerts, /budgets, /insights/msp-savings and /invoices). Every field is
 * optional on purpose: the reference reads all of them defensively
 * (`?? 0`, `?? []`, Array.isArray checks), and the helpers at the bottom of this
 * file do the same so a partial or unexpected payload degrades to empty
 * values instead of throwing during render.
 */

export type ProviderKey = 'azure' | 'aws' | 'btp' | 'gcp';

export interface DashboardMonthlyRow {
  /** "YYYY-MM" */
  key: string;
  total: number;
  azure?: number;
  aws?: number;
  btp?: number;
  gcp?: number;
}

/** GET /summary/dashboard */
export interface DashboardSummary {
  totals?: Partial<Record<ProviderKey, number>> & {
    forecast?: number | null;
    forecastByProvider?: Partial<Record<ProviderKey, number | null>>;
  };
  accounts?: Partial<Record<ProviderKey, unknown[]>>;
  monthly?: DashboardMonthlyRow[];
}

export interface RecommendationItem {
  id?: string | number;
  estimated_savings?: number | string;
  savingsAmount?: number | string;
}

/** GET /recommendations */
export interface RecommendationsResponse {
  data?: RecommendationItem[];
  summary?: { totalRecommendations?: number; totalEstimatedSavings?: number } | null;
}

export interface SmartAlertItem {
  id?: string | number;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  status?: string;
}

/** GET /smart-alerts */
export interface SmartAlertsResponse {
  alerts?: SmartAlertItem[];
  summary?: { bySeverity?: Partial<Record<'critical' | 'high' | 'medium' | 'low', number>> };
}

/** GET /budgets — a bare array in the reference (`bud?.data ?? []`). */
export interface BudgetItem {
  id?: string | number;
  target_amount?: number | string;
}

export interface MspSavingsBreakdownRow {
  provider: string;
  totalCost?: number;
  savingsRate?: number;
  savingsAmount?: number;
}

/** GET /insights/msp-savings */
export interface MspSavings {
  totalSpend?: number;
  totalSavings?: number;
  breakdown?: MspSavingsBreakdownRow[];
  invoiceSavings?: { totalSavings?: number; breakdown?: MspSavingsBreakdownRow[] } | null;
}

export interface InvoiceItem {
  id?: string | number;
  provider?: string;
  total_cost?: number | string;
  invoice_date?: string;
  created_at?: string;
}

/** GET /invoices */
export interface InvoicesResponse {
  data?: InvoiceItem[];
}

export interface DashboardSource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface DashboardData {
  summary: DashboardSource<DashboardSummary>;
  recommendations: DashboardSource<RecommendationsResponse>;
  smartAlerts: DashboardSource<SmartAlertsResponse>;
  budgets: DashboardSource<BudgetItem[]>;
  mspSavings: DashboardSource<MspSavings>;
  invoices: DashboardSource<InvoicesResponse>;
}

function initialSource<T>(): DashboardSource<T> {
  return { data: null, loading: true, error: null };
}

async function loadSource<T>(request: () => Promise<{ data: T }>): Promise<DashboardSource<T>> {
  try {
    const { data } = await request();
    return { data, loading: false, error: null };
  } catch {
    return { data: null, loading: false, error: 'Unable to load this data right now.' };
  }
}

export function useDashboardData(): DashboardData & { refetch: () => void } {
  const [state, setState] = useState<DashboardData>({
    summary: initialSource(),
    recommendations: initialSource(),
    smartAlerts: initialSource(),
    budgets: initialSource(),
    mspSavings: initialSource(),
    invoices: initialSource(),
  });

  const load = useCallback(() => {
    setState({
      summary: initialSource(),
      recommendations: initialSource(),
      smartAlerts: initialSource(),
      budgets: initialSource(),
      mspSavings: initialSource(),
      invoices: initialSource(),
    });

    loadSource<DashboardSummary>(() => api.get('/summary/dashboard')).then((summary) =>
      setState((s) => ({ ...s, summary })),
    );
    loadSource<RecommendationsResponse>(() => api.get('/recommendations')).then((recommendations) =>
      setState((s) => ({ ...s, recommendations })),
    );
    loadSource<SmartAlertsResponse>(() => api.get('/smart-alerts', { params: { pageSize: 10 } })).then(
      (smartAlerts) => setState((s) => ({ ...s, smartAlerts })),
    );
    loadSource<BudgetItem[]>(() => api.get('/budgets')).then((budgets) => setState((s) => ({ ...s, budgets })));
    loadSource<MspSavings>(() => api.get('/insights/msp-savings')).then((mspSavings) =>
      setState((s) => ({ ...s, mspSavings })),
    );
    loadSource<InvoicesResponse>(() => api.get('/invoices', { params: { pageSize: 500 } })).then((invoices) =>
      setState((s) => ({ ...s, invoices })),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refetch: load };
}

/* ── Derivations (mirror reference HomePage.jsx "derived values") ───────────── */

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** azure + aws + btp + gcp from `totals` (reference: totalSpend). */
export function totalSpendOf(summary: DashboardSummary | null): number {
  const totals = isObject(summary) && isObject(summary.totals) ? summary.totals : {};
  return num(totals.azure) + num(totals.aws) + num(totals.btp) + num(totals.gcp);
}

/** `monthly: [{key: "YYYY-MM", total}]` → chart points, sorted ascending. */
export function monthlyTrendOf(summary: DashboardSummary | null): SpendTrendPoint[] {
  const monthly = isObject(summary) && Array.isArray(summary.monthly) ? summary.monthly : [];
  return monthly
    .filter((row) => isObject(row) && typeof row.key === 'string')
    .map((row) => ({ date: row.key, amount: num(row.total) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Reference: `recsSummary?.totalRecommendations ?? recs.length`, where
 * `recs = r?.data?.data ?? r?.data` (a bare array is tolerated too).
 */
export function recommendationCountOf(response: RecommendationsResponse | RecommendationItem[] | null): number {
  if (Array.isArray(response)) return response.length;
  if (!isObject(response)) return 0;
  const summaryCount = isObject(response.summary) ? response.summary.totalRecommendations : undefined;
  if (typeof summaryCount === 'number') return summaryCount;
  return Array.isArray(response.data) ? response.data.length : 0;
}

/** Reference: `alertsData.alerts.filter((a) => a.status !== "resolved")`. */
export function activeAlertCountOf(response: SmartAlertsResponse | null): number {
  if (!isObject(response) || !Array.isArray(response.alerts)) return 0;
  return response.alerts.filter((alert) => alert?.status !== 'resolved').length;
}

export function budgetCountOf(budgets: BudgetItem[] | null): number {
  return Array.isArray(budgets) ? budgets.length : 0;
}

export function mspSavingsTotalOf(savings: MspSavings | null): number {
  return isObject(savings) ? num(savings.totalSavings) : 0;
}

/** Reference: `inv?.data?.data ?? inv?.data ?? []` (bare array tolerated), then `.length`. */
export function invoiceCountOf(response: InvoicesResponse | InvoiceItem[] | null): number {
  if (Array.isArray(response)) return response.length;
  return isObject(response) && Array.isArray(response.data) ? response.data.length : 0;
}
