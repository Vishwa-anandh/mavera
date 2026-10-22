import type { GlobalAlertRow } from '../../../data-access';

/**
 * Where an alert on the /alerts list is handled: an SAP alert opens SAP Alerts & Escalations, a cloud alert opens
 * Smart Alerts (already filtered to critical ones when this one is critical).
 */
export function alertTarget(alert: GlobalAlertRow): string {
  if (alert.module === 'SAP') return '/sap/alerts';
  return alert.severity === 'critical' ? '/smart-alerts?status=critical' : '/smart-alerts';
}
