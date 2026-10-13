import { useSyncExternalStore } from 'react';
import { idocRepository, type IdocAlert, type IdocAlertRule, type IdocRecord, type IdocReportJob } from '../../../data-access';
import { statusInfo } from './idocStatus';

/**
 * PROTOTYPE session state for IDoc Monitoring: records, alerts, alert rules and report jobs,
 * loaded once from the repository and shared by every IDoc page, so a retry submitted on Failed
 * IDocs is visible on Processing Status and Partners too. Changes last for the session only;
 * with a backend, each action below becomes an API call.
 */
interface IdocState {
  records: IdocRecord[];
  alerts: IdocAlert[];
  rules: IdocAlertRule[];
  reports: IdocReportJob[];
}

const load = (): IdocState => ({
  records: idocRepository.listRecords(),
  alerts: idocRepository.listAlerts(),
  rules: idocRepository.listAlertRules(),
  reports: idocRepository.listReports(),
});

let state = load();
const listeners = new Set<() => void>();
const set = (next: IdocState) => {
  state = next;
  for (const listener of listeners) listener();
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useIdocState(): IdocState {
  return useSyncExternalStore(subscribe, () => state);
}

export interface ReprocessOutcome {
  submitted: string[];
  skipped: Array<{ docnum: string; reason: string }>;
}

/**
 * Submits a retry for each record SAP allows to be reprocessed. A submitted retry is Pending
 * until SAP reports a new status — it is never marked successful here (IDOC-03). Records that
 * can't be retried, or already have a retry pending, are reported back with the reason.
 */
export function reprocessIdocs(docnums: string[]): ReprocessOutcome {
  const outcome: ReprocessOutcome = { submitted: [], skipped: [] };
  const at = new Date().toISOString();
  const records = state.records.map((record) => {
    if (!docnums.includes(record.docnum)) return record;
    const info = statusInfo(record.statusCode);
    if (info.lifecycle !== 'Failed' || !info.reprocessable) {
      outcome.skipped.push({ docnum: record.docnum, reason: info.reprocessHint ?? `Status ${record.statusCode} (${info.description}) can’t be reprocessed.` });
      return record;
    }
    if (record.retries.some((retry) => retry.result === 'Pending')) {
      outcome.skipped.push({ docnum: record.docnum, reason: 'A retry is already pending.' });
      return record;
    }
    outcome.submitted.push(record.docnum);
    return { ...record, updatedAt: at, retries: [...record.retries, { at, result: 'Pending' as const }] };
  });
  set({ ...state, records });
  return outcome;
}

export function setAlertLifecycle(id: string, lifecycle: IdocAlert['lifecycle']): void {
  set({ ...state, alerts: state.alerts.map((alert) => (alert.id === id ? { ...alert, lifecycle } : alert)) });
}

export function toggleAlertRule(id: string): void {
  set({ ...state, rules: state.rules.map((rule) => (rule.id === id ? { ...rule, enabled: !rule.enabled } : rule)) });
}

export function addReport(job: IdocReportJob): void {
  set({ ...state, reports: [job, ...state.reports] });
}

/** Test helper: back to the seeded data. */
export function resetIdocState(): void {
  set(load());
}
