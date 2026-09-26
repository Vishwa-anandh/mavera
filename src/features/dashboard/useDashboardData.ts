import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { api } from '../../api';

export interface DashboardSummary {
  totalSpend: number;
  currency: string;
  periodLabel: string;
  previousPeriodChangePct?: number;
}

export interface RecommendationItem {
  id: string;
  estimatedMonthlySavings?: number;
}

export interface SmartAlertItem {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface BudgetItem {
  id: string;
  overBudget?: boolean;
}

export interface MspSavings {
  estimatedSavings: number;
  currency: string;
}

export interface InvoiceItem {
  id: string;
}

export interface DashboardSource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface DashboardData {
  summary: DashboardSource<DashboardSummary>;
  recommendations: DashboardSource<RecommendationItem[]>;
  smartAlerts: DashboardSource<SmartAlertItem[]>;
  budgets: DashboardSource<BudgetItem[]>;
  mspSavings: DashboardSource<MspSavings>;
  invoices: DashboardSource<InvoiceItem[]>;
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

  // Kicks off all six requests. Each one resolves independently and merges
  // only its own slice back into state, so one slow or failing source never
  // blocks (or clobbers) another's result.
  const fetchAll = useCallback(() => {
    loadSource<DashboardSummary>(() => api.get('/summary/dashboard')).then((summary) =>
      setState((s) => ({ ...s, summary })),
    );
    loadSource<RecommendationItem[]>(() => api.get('/recommendations')).then((recommendations) =>
      setState((s) => ({ ...s, recommendations })),
    );
    loadSource<SmartAlertItem[]>(() => api.get('/smart-alerts', { params: { pageSize: 10 } })).then(
      (smartAlerts) => setState((s) => ({ ...s, smartAlerts })),
    );
    loadSource<BudgetItem[]>(() => api.get('/budgets')).then((budgets) => setState((s) => ({ ...s, budgets })));
    loadSource<MspSavings>(() => api.get('/insights/msp-savings')).then((mspSavings) =>
      setState((s) => ({ ...s, mspSavings })),
    );
    loadSource<InvoiceItem[]>(() => api.get('/invoices', { params: { pageSize: 500 } })).then((invoices) =>
      setState((s) => ({ ...s, invoices })),
    );
  }, []);

  useEffect(() => {
    // Initial state is already "every source loading" (see useState above),
    // so the mount effect only needs to kick off the requests.
    fetchAll();
  }, [fetchAll]);

  const refetch = useCallback(() => {
    // React 19 batches state updates from plain (non-DOM-event) callbacks
    // into a microtask, so a caller that synchronously inspects state right
    // after invoking refetch() would still see the pre-reset values.
    // flushSync forces the reset to commit before refetch() returns, so
    // "refetch immediately flips every source back to loading" holds for
    // synchronous callers.
    flushSync(() => {
      setState({
        summary: initialSource(),
        recommendations: initialSource(),
        smartAlerts: initialSource(),
        budgets: initialSource(),
        mspSavings: initialSource(),
        invoices: initialSource(),
      });
    });
    fetchAll();
  }, [fetchAll]);

  return { ...state, refetch };
}
