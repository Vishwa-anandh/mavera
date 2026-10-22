import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetSapAdminStore, resetSmartAlertsStore, sapAdminRepository, sapRepository, smartAlertsRepository } from '../../../data-access';
import * as alertsChanged from '../../../shared/lib/alertsChanged';
import { CCM_TOAST_EVENT, type ToastDetail } from '../../../shared/lib/toastEvents';
import { actOnAttention } from './attentionActions';
import type { AttentionItem } from './attentionFeed';

const cloudRow = (id: string): AttentionItem => ({ id: `cost-alert-${id}`, module: 'cloud', tone: 'danger', title: 'Spend spiked', alert: { kind: 'cloud', id } });
const sapRow = (id: string): AttentionItem => ({ id: `sap-alert-${id}`, module: 'sap', tone: 'warning', title: 'Dumps anomaly', alert: { kind: 'sap', id } });
const cloud = (id: string) => smartAlertsRepository.list().find((a) => a.id === id)!;
const sap = (id: string) => sapAdminRepository.alerts.list().find((a) => a.id === id)!;

let toasts: ToastDetail[] = [];
const onToast = (event: Event) => { toasts.push((event as CustomEvent<ToastDetail>).detail); };

beforeEach(() => {
  resetSmartAlertsStore();
  resetSapAdminStore();
  toasts = [];
  window.addEventListener(CCM_TOAST_EVENT, onToast);
});
afterEach(() => {
  window.removeEventListener(CCM_TOAST_EVENT, onToast);
  vi.restoreAllMocks();
});

describe('actOnAttention', () => {
  it('resolves a cost alert in the Smart Alerts store and offers Undo, which restores it exactly', () => {
    const notify = vi.spyOn(alertsChanged, 'notifyAlertsChanged');
    const before = cloud('alert-1');
    expect(actOnAttention([cloudRow('alert-1')], 'resolve')).toBe(1);
    expect(cloud('alert-1').status).toBe('resolved');
    expect(notify).toHaveBeenCalledTimes(1);
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({ type: 'success', message: 'Alert resolved: Spend spiked', action: { label: 'Undo' } });

    toasts[0].action!.onClick();
    expect(cloud('alert-1')).toEqual(before);
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it('ignoring a cost alert widens its account, and Undo takes that back', () => {
    const feedback = smartAlertsRepository.getAccountFeedback()['az-acc-1'] ?? 0;
    actOnAttention([cloudRow('alert-1')], 'ignore');
    expect(cloud('alert-1').ignored).toBe(true);
    expect(smartAlertsRepository.getAccountFeedback()['az-acc-1']).toBe(feedback + 1);
    toasts[0].action!.onClick();
    expect(cloud('alert-1').ignored).toBe(false);
    expect(smartAlertsRepository.getAccountFeedback()['az-acc-1'] ?? 0).toBe(feedback);
  });

  it('resolves an SAP alert in the SAP alert store, which the rest of the app counts, and Undo makes it unread again', () => {
    const before = sap('alert-1');
    const outstanding = sapRepository.listAlerts().length;
    actOnAttention([sapRow('alert-1')], 'resolve');
    expect(sap('alert-1')).toMatchObject({ state: 'resolved', read: true });
    expect(sapRepository.listAlerts().length).toBe(outstanding - 1);
    toasts[0].action!.onClick();
    expect(sap('alert-1')).toEqual(before);
    expect(sapRepository.listAlerts().length).toBe(outstanding);
  });

  it('acts on every alert row at once ("Resolve all") with one Undo, skipping rows that are not alerts', () => {
    const rows: AttentionItem[] = [cloudRow('alert-1'), sapRow('alert-1'), { id: 'budget-use', module: 'cloud', tone: 'warning', title: 'Budget' }];
    expect(actOnAttention(rows, 'resolve')).toBe(2);
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('2 alerts resolved.');
    toasts[0].action!.onClick();
    expect(cloud('alert-1').status).toBe('unread');
    expect(sap('alert-1').state).toBe('active');
  });

  it('does nothing, and says nothing, for an alert the store does not hold', () => {
    const notify = vi.spyOn(alertsChanged, 'notifyAlertsChanged');
    expect(actOnAttention([cloudRow('no-such-alert')], 'resolve')).toBe(0);
    expect(toasts).toHaveLength(0);
    expect(notify).not.toHaveBeenCalled();
  });
});
