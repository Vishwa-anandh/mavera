import type { InsightItem, InsightTone } from '../../../shared/ui/InsightList';
import type { SmartAlertItem } from './useDashboardData';

export type AttentionModule = 'sap' | 'cloud';

export interface AttentionItem extends InsightItem {
  module: AttentionModule;
}

export interface ExpiringReservation {
  name: string;
  daysLeft: number;
}

export interface AttentionInput {
  modules: { cloudCost: boolean; sapMonitoring: boolean };
  /** SAP findings, already derived by the SAP feature. */
  sapInsights: InsightItem[];
  /** Open (not resolved) cost anomalies. */
  smartAlerts: SmartAlertItem[];
  budgetUtilPct: number | null;
  totalBudget: number;
  forecastEom: number | null;
  /** Open optimization opportunities rated High impact. */
  highImpactSavings: number;
  expiringReservations: ExpiringReservation[];
}

const TONE_ORDER: Record<InsightTone, number> = { danger: 0, warning: 1, info: 2, success: 3 };

/** Whole days from `now` until `end` (a "YYYY-MM-DD" date); negative once it has passed. */
export function daysUntil(end: string, now: Date): number {
  const target = new Date(`${end}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/**
 * One ranked list of what needs a person across every module the org has: SAP findings, cost
 * anomalies, budget pressure, high-impact savings and reservations about to expire. Only modules the
 * org is subscribed to contribute. Most urgent first; within a tone, the order the sources give.
 */
export function buildAttentionFeed(input: AttentionInput): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (input.modules.sapMonitoring) {
    for (const insight of input.sapInsights) items.push({ ...insight, module: 'sap' });
  }

  if (input.modules.cloudCost) {
    const critical = input.smartAlerts.filter((a) => a.severity === 'critical');
    const high = input.smartAlerts.filter((a) => a.severity === 'high');
    for (const alert of critical) {
      items.push({ id: `cost-alert-${alert.id}`, module: 'cloud', tone: 'danger', title: alert.title ?? 'Critical cost alert', detail: 'Cost anomaly · critical', to: '/smart-alerts' });
    }
    for (const alert of high) {
      items.push({ id: `cost-alert-${alert.id}`, module: 'cloud', tone: 'warning', title: alert.title ?? 'High-severity cost alert', detail: 'Cost anomaly · high', to: '/smart-alerts' });
    }

    if (input.totalBudget > 0 && input.forecastEom !== null && input.forecastEom > input.totalBudget) {
      items.push({
        id: 'budget-forecast',
        module: 'cloud',
        tone: 'danger',
        title: 'Forecast is over budget',
        detail: `Month-end forecast ${Math.round((input.forecastEom / input.totalBudget) * 100)}% of the ${input.totalBudget.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} budget.`,
        to: '/budgets',
      });
    } else if (input.budgetUtilPct !== null && input.budgetUtilPct >= 80) {
      items.push({ id: 'budget-use', module: 'cloud', tone: 'warning', title: `${input.budgetUtilPct}% of the monthly budget used`, detail: 'Spend is close to the limit.', to: '/budgets' });
    }

    for (const reservation of input.expiringReservations) {
      items.push({
        id: `reservation-${reservation.name}`,
        module: 'cloud',
        tone: reservation.daysLeft <= 7 ? 'warning' : 'info',
        title: `${reservation.name} expires in ${reservation.daysLeft} ${reservation.daysLeft === 1 ? 'day' : 'days'}`,
        detail: 'Renew or let it lapse deliberately.',
        to: '/cloud/reservations',
      });
    }

    if (input.highImpactSavings > 0) {
      items.push({
        id: 'savings',
        module: 'cloud',
        tone: 'info',
        title: `${input.highImpactSavings} high-impact ${input.highImpactSavings === 1 ? 'saving' : 'savings'} waiting`,
        detail: 'Assign an owner or dismiss with a reason.',
        to: '/cloud/optimization',
      });
    }
  }

  // Stable sort: JS sort keeps source order within a tone.
  return items.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
}
