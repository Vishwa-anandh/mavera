import type { InsightItem, InsightTone } from '../../../shared/ui/InsightList';
import type { SmartAlertItem } from './useDashboardData';

export type AttentionModule = 'sap' | 'cloud';

/** The stored alert behind a row, so Resolve and Ignore can act on it in place. */
export interface AttentionAlertRef {
  kind: 'cloud' | 'sap';
  id: string;
}

export interface AttentionItem extends InsightItem {
  module: AttentionModule;
  /** Present on rows that are one alert in a store; absent on budget, savings, reservation and system rows. */
  alert?: AttentionAlertRef;
}

/** An SAP alert as the feed needs it (see sapAdminRepository.alerts). */
export interface AttentionSapAlert {
  id: string;
  type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  system: string;
  message: string;
  read: boolean;
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
  /**
   * Active SAP alerts. When given, each unread Critical or High one is its own row (so it can be resolved in place)
   * and replaces the SAP feature's single "N unread critical or high alerts" finding.
   */
  sapAlerts?: AttentionSapAlert[];
  /** Ids of the cost alerts the alert store can act on; only those rows get Resolve and Ignore. Default: none. */
  actionableCloudAlertIds?: ReadonlySet<string>;
  budgetUtilPct: number | null;
  totalBudget: number;
  forecastEom: number | null;
  /** Open optimization opportunities rated High impact. */
  highImpactSavings: number;
  expiringReservations: ExpiringReservation[];
}

const TONE_ORDER: Record<InsightTone, number> = { danger: 0, warning: 1, info: 2, success: 3 };

/** Cuts at a word boundary and adds an ellipsis, so a long message never ends mid-word. */
function shorten(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 1))}…`;
}

/** A system id can be a long GUID; show a short form that is still recognisable. */
const systemLabel = (system: string) => (system.length > 14 ? `${system.slice(0, 8)}…` : system);

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
    const perAlert = input.sapAlerts !== undefined;
    for (const insight of input.sapInsights) {
      if (perAlert && insight.id === 'alerts') continue;
      items.push({ ...insight, module: 'sap' });
    }
    for (const alert of input.sapAlerts ?? []) {
      if (alert.read || (alert.severity !== 'Critical' && alert.severity !== 'High')) continue;
      items.push({
        id: `sap-alert-${alert.id}`,
        module: 'sap',
        tone: alert.severity === 'Critical' ? 'danger' : 'warning',
        title: `${alert.type} anomaly on ${systemLabel(alert.system)}`,
        detail: shorten(alert.message, 110),
        to: '/sap/alerts',
        alert: { kind: 'sap', id: alert.id },
      });
    }
  }

  if (input.modules.cloudCost) {
    const actionable = input.actionableCloudAlertIds;
    const refOf = (alert: SmartAlertItem): AttentionAlertRef | undefined => (alert.id !== undefined && actionable?.has(String(alert.id)) ? { kind: 'cloud', id: String(alert.id) } : undefined);
    const critical = input.smartAlerts.filter((a) => a.severity === 'critical');
    const high = input.smartAlerts.filter((a) => a.severity === 'high');
    for (const alert of critical) {
      items.push({ id: `cost-alert-${alert.id}`, module: 'cloud', tone: 'danger', title: alert.title ?? 'Critical cost alert', detail: 'Cost anomaly · critical', to: '/smart-alerts?status=critical', alert: refOf(alert) });
    }
    for (const alert of high) {
      items.push({ id: `cost-alert-${alert.id}`, module: 'cloud', tone: 'warning', title: alert.title ?? 'High-severity cost alert', detail: 'Cost anomaly · high', to: '/smart-alerts', alert: refOf(alert) });
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
