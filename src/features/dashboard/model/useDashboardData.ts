import { useCallback, useEffect, useState } from 'react';
import { api, TOKEN_KEY } from '../../../data-access';
import { buildMode } from '../../../app/config/environment';
import type { SpendTrendPoint } from '../../../shared/ui/SpendTrendChart';

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
  title?: string;
  message?: string;
  alert_type?: string;
  detected_at?: string;
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

function loadedSource<T>(data: T): DashboardSource<T> {
  return { data, loading: false, error: null };
}

/*
 * The dev-preview login (AuthContext.devLogin) skips real authentication, so
 * there's never a token in that path — a reliable signal that we're in the
 * unauthenticated local prototype, not a real backend session. `MODE` (not
 * `DEV`) is the check that actually excludes Vitest: Vitest sets MODE to
 * "test", while `vite dev` sets it to "development" — both have DEV=true, so
 * gating on DEV alone would also short-circuit useDashboardData.test.ts.
 */
function isDevPreview(): boolean {
  return buildMode === 'development' && !localStorage.getItem(TOKEN_KEY);
}

/** Realistic placeholder data so the dashboard renders fully with no backend. */
function devMockData(): DashboardData {
  return {
    summary: loadedSource<DashboardSummary>({
      totals: { azure: 8420, aws: 5310, btp: 1860, gcp: 640, forecast: 17400, forecastByProvider: { azure: 9050, aws: 5680, btp: 1990, gcp: 680 } },
      accounts: { azure: [{ id: 'az-1' }, { id: 'az-2' }], aws: [{ id: 'aw-1' }], btp: [{ id: 'bt-1' }], gcp: [] },
      monthly: [
        { key: '2026-04', total: 13100, azure: 6600, aws: 4900, btp: 1200, gcp: 400 },
        { key: '2026-05', total: 14250, azure: 7100, aws: 5000, btp: 1650, gcp: 500 },
        { key: '2026-06', total: 13800, azure: 6900, aws: 4950, btp: 1500, gcp: 450 },
        { key: '2026-07', total: 15420, azure: 7800, aws: 5200, btp: 1720, gcp: 700 },
        { key: '2026-08', total: 16230, azure: 8100, aws: 5400, btp: 1800, gcp: 930 },
        { key: '2026-09', total: 16230, azure: 8420, aws: 5310, btp: 1860, gcp: 640 },
      ],
    }),
    recommendations: loadedSource<RecommendationsResponse>({
      data: [
        { id: 'r1', estimated_savings: 420 },
        { id: 'r2', estimated_savings: 180 },
        { id: 'r3', estimated_savings: 90 },
        { id: 'r4', estimated_savings: 260 },
      ],
      summary: { totalRecommendations: 12, totalEstimatedSavings: 2140 },
    }),
    smartAlerts: loadedSource<SmartAlertsResponse>({
      alerts: [
        { id: 'a1', severity: 'critical', status: 'open', title: 'Azure spend spiked 34% in the last 24 hours', alert_type: 'spike', detected_at: '2026-09-28T04:10:00Z' },
        { id: 'a2', severity: 'high', status: 'open', title: 'AWS budget threshold crossed 85%', alert_type: 'budget_breach', detected_at: '2026-09-27T21:40:00Z' },
        { id: 'a3', severity: 'medium', status: 'open', title: 'New GCP BigQuery instance created outside business hours', alert_type: 'resource_creation', detected_at: '2026-09-27T14:05:00Z' },
        { id: 'a4', severity: 'low', status: 'resolved', title: 'SAP BTP usage anomaly auto-resolved', alert_type: 'unusual_spend', detected_at: '2026-09-26T09:15:00Z' },
      ],
      summary: { bySeverity: { critical: 1, high: 1, medium: 1, low: 1 } },
    }),
    budgets: loadedSource<BudgetItem[]>([
      { id: 'b1', target_amount: 15000 },
      { id: 'b2', target_amount: 8000 },
      { id: 'b3', target_amount: 4000 },
    ]),
    mspSavings: loadedSource<MspSavings>({
      totalSpend: 16230,
      totalSavings: 2140,
      invoiceSavings: null,
      breakdown: [
        { provider: 'azure', totalCost: 8420, savingsRate: 0.11, savingsAmount: 926 },
        { provider: 'aws', totalCost: 5310, savingsRate: 0.14, savingsAmount: 743 },
        { provider: 'btp', totalCost: 1860, savingsRate: 0.15, savingsAmount: 279 },
        { provider: 'gcp', totalCost: 640, savingsRate: 0.29, savingsAmount: 192 },
      ],
    }),
    invoices: loadedSource<InvoicesResponse>({
      data: [
        { id: 'i1', provider: 'azure', total_cost: 2810, invoice_date: '2026-09-01' },
        { id: 'i2', provider: 'aws', total_cost: 1770, invoice_date: '2026-09-01' },
        { id: 'i3', provider: 'btp', total_cost: 620, invoice_date: '2026-09-01' },
        { id: 'i4', provider: 'azure', total_cost: 2705, invoice_date: '2026-08-01' },
        { id: 'i5', provider: 'aws', total_cost: 1802, invoice_date: '2026-08-01' },
      ],
    }),
  };
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

    if (isDevPreview()) {
      // Prototype build, no backend: skip the real requests (which would
      // otherwise retry for ~7s per source before surfacing errors) and
      // populate with placeholder data instead.
      setTimeout(() => setState(devMockData()), 350);
      return;
    }

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

export interface MonthlyProviderRow {
  /** "YYYY-MM" */
  key: string;
  /** Short label for an axis, e.g. "Sep". */
  name: string;
  azure: number;
  aws: number;
  btp: number;
  gcp: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `monthly` rows as per-provider stacked-bar data for the last `months` months, ascending. */
export function monthlyByProviderOf(summary: DashboardSummary | null, months = 6): MonthlyProviderRow[] {
  const monthly = isObject(summary) && Array.isArray(summary.monthly) ? summary.monthly : [];
  return monthly
    .filter((row) => isObject(row) && typeof row.key === 'string' && /^\d{4}-\d{2}$/.test(row.key))
    .map((row) => ({
      key: row.key,
      name: MONTH_NAMES[Number(row.key.slice(5, 7)) - 1] ?? row.key,
      azure: num(row.azure),
      aws: num(row.aws),
      btp: num(row.btp),
      gcp: num(row.gcp),
    }))
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-months);
}

export interface ProviderMover {
  provider: ProviderKey;
  current: number;
  previous: number;
  /** Month-over-month change in percent, one decimal; null when there is no previous spend to compare. */
  changePct: number | null;
  delta: number;
}

/** Month-over-month change per provider (latest vs previous month), biggest absolute move first. */
export function providerMoversOf(summary: DashboardSummary | null): ProviderMover[] {
  const rows = monthlyByProviderOf(summary, 2);
  if (rows.length < 2) return [];
  const [previous, latest] = rows;
  return (['azure', 'aws', 'btp', 'gcp'] as ProviderKey[])
    .map((provider) => {
      const current = latest[provider];
      const before = previous[provider];
      return {
        provider,
        current,
        previous: before,
        delta: current - before,
        changePct: before > 0 ? Math.round(((current - before) / before) * 1000) / 10 : null,
      };
    })
    .filter((m) => m.current > 0 || m.previous > 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
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

function invoiceItemsOf(response: InvoicesResponse | InvoiceItem[] | null): InvoiceItem[] {
  if (Array.isArray(response)) return response;
  return isObject(response) && Array.isArray(response.data) ? response.data : [];
}

/** Per-provider MTD spend, straight off `totals` — one entry per provider. */
export function providerTotalsOf(summary: DashboardSummary | null): Record<ProviderKey, number> {
  const totals = isObject(summary) && isObject(summary.totals) ? summary.totals : {};
  return { azure: num(totals.azure), aws: num(totals.aws), btp: num(totals.btp), gcp: num(totals.gcp) };
}

/** % change of the latest month's total vs. the one before it, or null with fewer than 2 months. */
export function spendChangePctOf(summary: DashboardSummary | null): number | null {
  const monthly = monthlyTrendOf(summary);
  if (monthly.length < 2) return null;
  const previous = monthly[monthly.length - 2].amount;
  const latest = monthly[monthly.length - 1].amount;
  if (previous <= 0) return null;
  return Math.round(((latest - previous) / previous) * 1000) / 10;
}

export function totalBudgetOf(budgets: BudgetItem[] | null): number {
  return Array.isArray(budgets) ? budgets.reduce((sum, b) => sum + num(b.target_amount), 0) : 0;
}

/** Reference: `Math.round((totalSpend / totalBudget) * 100)`, or null with no budgets configured. */
export function budgetUtilPctOf(totalSpend: number, totalBudget: number): number | null {
  if (totalBudget <= 0) return null;
  return Math.round((totalSpend / totalBudget) * 100);
}

export function forecastEomOf(summary: DashboardSummary | null): number | null {
  const totals = isObject(summary) && isObject(summary.totals) ? summary.totals : {};
  const forecast = totals.forecast;
  return typeof forecast === 'number' ? forecast : null;
}

export function forecastByProviderOf(summary: DashboardSummary | null): Partial<Record<ProviderKey, number>> {
  const totals = isObject(summary) && isObject(summary.totals) ? summary.totals : {};
  const byProvider = isObject(totals.forecastByProvider) ? totals.forecastByProvider : {};
  const result: Partial<Record<ProviderKey, number>> = {};
  (['azure', 'aws', 'btp', 'gcp'] as ProviderKey[]).forEach((p) => {
    const v = byProvider[p];
    if (typeof v === 'number') result[p] = v;
  });
  return result;
}

/** Reference: alerts whose status isn't "resolved" — the full items, not just the count. */
export function activeAlertsOf(response: SmartAlertsResponse | null): SmartAlertItem[] {
  if (!isObject(response) || !Array.isArray(response.alerts)) return [];
  return response.alerts.filter((alert) => alert?.status !== 'resolved');
}

export function alertSeverityCountsOf(alerts: SmartAlertItem[]): { critical: number; warning: number } {
  return {
    critical: alerts.filter((a) => a.severity === 'critical').length,
    warning: alerts.filter((a) => a.severity === 'high' || a.severity === 'medium').length,
  };
}

export function totalAccountsOf(summary: DashboardSummary | null): number {
  const accounts = isObject(summary) && isObject(summary.accounts) ? summary.accounts : {};
  return (['azure', 'aws', 'btp', 'gcp'] as ProviderKey[]).reduce((sum, p) => {
    const list = accounts[p];
    return sum + (Array.isArray(list) ? list.length : 0);
  }, 0);
}

const PROVIDER_LABELS: Record<ProviderKey, string> = { azure: 'Azure', aws: 'AWS', btp: 'SAP BTP', gcp: 'GCP' };

export function connectedProvidersOf(summary: DashboardSummary | null): ProviderKey[] {
  const accounts = isObject(summary) && isObject(summary.accounts) ? summary.accounts : {};
  return (['azure', 'aws', 'btp', 'gcp'] as ProviderKey[]).filter((p) => {
    const list = accounts[p];
    return Array.isArray(list) && list.length > 0;
  });
}

export interface InvoiceStats {
  count: number;
  total: number;
  byProvider: Partial<Record<ProviderKey, number>>;
}

export function invoiceStatsOf(response: InvoicesResponse | InvoiceItem[] | null): InvoiceStats {
  const items = invoiceItemsOf(response);
  const byProvider: Partial<Record<ProviderKey, number>> = {};
  let total = 0;
  for (const item of items) {
    total += num(item.total_cost);
    const provider = item.provider as ProviderKey | undefined;
    if (provider) byProvider[provider] = (byProvider[provider] ?? 0) + 1;
  }
  return { count: items.length, total, byProvider };
}

export interface MspProviderRow {
  provider: ProviderKey;
  label: string;
  rate: number;
  spend: number;
  savings: number;
}

/** Maps the raw `mspSavings.breakdown` rows into display-ready rows, dropping
 * providers with no spend so a hybrid org's zero-spend providers don't show
 * an empty $0 row. */
export function mspProviderRowsOf(savings: MspSavings | null): MspProviderRow[] {
  const breakdown = isObject(savings) && Array.isArray(savings.breakdown) ? savings.breakdown : [];
  return breakdown
    .filter((row) => num(row.totalCost) > 0)
    .map((row) => ({
      provider: row.provider as ProviderKey,
      label: PROVIDER_LABELS[row.provider as ProviderKey] ?? row.provider,
      rate: num(row.savingsRate),
      spend: num(row.totalCost),
      savings: num(row.savingsAmount),
    }));
}

export interface OverviewInsight {
  type: 'success' | 'warning' | 'info';
  title: string;
  detail: string;
}

/**
 * A handful of headline observations built from data already on the page —
 * not a separate AI call. Mirrors the tone/format of the per-provider
 * `buildAiInsights` helpers on the Azure/AWS/BTP/GCP cost pages so the
 * "AI Insights" card reads consistently everywhere in the app.
 */
export function buildOverviewInsights(params: {
  totalSpend: number;
  spendChangePct: number | null;
  budgetUtilPct: number | null;
  totalBudget: number;
  forecastEom: number | null;
  criticalCount: number;
  totalSavings: number;
  recsCount: number;
}): OverviewInsight[] {
  const { spendChangePct, budgetUtilPct, totalBudget, forecastEom, criticalCount, totalSavings, recsCount } = params;
  const insights: OverviewInsight[] = [];

  if (criticalCount > 0) {
    insights.push({ type: 'warning', title: `${criticalCount} critical alert${criticalCount > 1 ? 's' : ''} need attention`, detail: 'Review the Smart Alerts page to see what triggered them and whether spend is still climbing.' });
  }

  if (budgetUtilPct !== null && forecastEom !== null && totalBudget > 0) {
    if (forecastEom > totalBudget) {
      insights.push({ type: 'warning', title: 'Forecast is on track to exceed budget this month', detail: `Projected end-of-month spend is ${formatCurrencyForInsight(forecastEom)} against a ${formatCurrencyForInsight(totalBudget)} budget — consider tightening spend or adjusting the budget.` });
    } else if (budgetUtilPct < 75) {
      insights.push({ type: 'success', title: 'Spend is comfortably within budget', detail: `${budgetUtilPct}% of the monthly budget used so far, with forecast staying under the limit.` });
    }
  }

  if (spendChangePct !== null && Math.abs(spendChangePct) >= 5) {
    insights.push({
      type: spendChangePct > 0 ? 'warning' : 'success',
      title: `Spend ${spendChangePct > 0 ? 'increased' : 'decreased'} ${Math.abs(spendChangePct)}% vs. last month`,
      detail: spendChangePct > 0 ? 'Check the Spend Trend chart to see which provider is driving the change.' : 'Recent optimizations or reduced usage may be contributing to the drop.',
    });
  }

  if (recsCount > 0) {
    insights.push({ type: 'info', title: `${recsCount} open recommendation${recsCount > 1 ? 's' : ''} worth ${formatCurrencyForInsight(totalSavings)}/mo`, detail: 'Apply them from the Recommendations page to capture the estimated savings.' });
  }

  return insights;
}

function formatCurrencyForInsight(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}
