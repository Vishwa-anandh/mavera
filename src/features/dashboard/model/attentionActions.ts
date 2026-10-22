import { smartAlertsRepository, sapAdminRepository, type SapSmartAlert, type SmartAlert } from '../../../data-access';
import { notifyAlertsChanged } from '../../../shared/lib/alertsChanged';
import { fireToast } from '../../../shared/lib/toastEvents';
import type { AttentionAlertRef, AttentionItem } from './attentionFeed';

export type AttentionVerb = 'resolve' | 'ignore';

/** What an alert looked like before it was acted on: enough to put it back exactly. */
type Snapshot = { kind: 'cloud'; alert: SmartAlert } | { kind: 'sap'; alert: SapSmartAlert };

function snapshotOf(ref: AttentionAlertRef): Snapshot | null {
  if (ref.kind === 'cloud') {
    const alert = smartAlertsRepository.list().find((a) => a.id === ref.id);
    return alert ? { kind: 'cloud', alert } : null;
  }
  const alert = sapAdminRepository.alerts.list().find((a) => a.id === ref.id);
  return alert ? { kind: 'sap', alert } : null;
}

function apply(ref: AttentionAlertRef, verb: AttentionVerb): void {
  if (ref.kind === 'cloud') {
    if (verb === 'resolve') smartAlertsRepository.resolve(ref.id);
    else smartAlertsRepository.ignore(ref.id);
  } else if (verb === 'resolve') sapAdminRepository.alerts.resolve(ref.id);
  else sapAdminRepository.alerts.ignore(ref.id);
}

function restore(snapshot: Snapshot): void {
  if (snapshot.kind === 'cloud') smartAlertsRepository.restore(snapshot.alert);
  else sapAdminRepository.alerts.restore(snapshot.alert);
}

const plural = (n: number) => (n === 1 ? 'alert' : 'alerts');

/**
 * Resolves or ignores the stored alerts behind the given "Needs attention" rows, in the same stores the Smart Alerts
 * and SAP Alerts pages use, so the dashboard counts, those pages and the bell all agree afterwards. Shows a toast with
 * Undo that puts every alert back exactly as it was. Rows that are not an alert (budget, savings, a system) are skipped.
 * Returns how many alerts changed.
 */
export function actOnAttention(items: AttentionItem[], verb: AttentionVerb): number {
  const snapshots: Snapshot[] = [];
  for (const item of items) {
    if (!item.alert) continue;
    const snapshot = snapshotOf(item.alert);
    if (!snapshot) continue;
    apply(item.alert, verb);
    snapshots.push(snapshot);
  }
  if (snapshots.length === 0) return 0;
  notifyAlertsChanged();
  const past = verb === 'resolve' ? 'resolved' : 'ignored';
  const message = snapshots.length === 1
    ? `Alert ${past}: ${items.find((item) => item.alert)?.title ?? 'alert'}`
    : `${snapshots.length} ${plural(snapshots.length)} ${past}.`;
  fireToast({
    type: 'success',
    message: message.length > 120 ? `${message.slice(0, 117)}…` : message,
    action: {
      label: 'Undo',
      onClick: () => {
        snapshots.forEach(restore);
        notifyAlertsChanged();
      },
    },
  });
  return snapshots.length;
}

/** Items in the feed that can be resolved or ignored in place. */
export const actionableItems = (items: AttentionItem[]): AttentionItem[] => items.filter((item) => item.alert);
