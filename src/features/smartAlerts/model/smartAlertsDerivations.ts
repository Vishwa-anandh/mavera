import type { AlertSeverity, AlertType } from './smartAlertsTypes';

export const SEVERITY_LABELS: Record<AlertSeverity, string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
export const SEVERITY_TONE: Record<AlertSeverity, 'danger' | 'warning' | 'info'> = { critical: 'danger', high: 'danger', medium: 'warning', low: 'info' };

export const TYPE_LABELS: Record<AlertType, string> = {
  spike: 'Cost Spike',
  unusual_spend: 'Unusual Spend',
  abnormal_usage: 'Abnormal Usage',
  budget_breach: 'Budget Breach',
  forecast: 'Forecast Alert',
  resource_creation: 'New Resource',
  resource_deletion: 'Resource Removed',
};

export function formatMoney(value: number | undefined): string | null {
  if (value === undefined || value === null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}
