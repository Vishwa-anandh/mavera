import type { IdocAlert, IdocAlertRule, IdocRecord, IdocReportJob } from '../contracts/idoc';
import { MOCK_IDOC_ALERT_RULES, MOCK_IDOC_ALERTS, MOCK_IDOC_RECORDS, MOCK_IDOC_REPORTS } from '../../demo/idoc/mockIdocRecords';

/**
 * IDoc Monitoring data source. PROTOTYPE: backed by the seeded sample in src/demo until an IDoc
 * API contract is verified (MAVERA_DESIGN_SYSTEM.md §14); replace these bodies with REST calls
 * through ./rest and the pages keep working unchanged. Returns copies so callers can't mutate
 * the fixtures.
 */
export const idocRepository = {
  listRecords(): IdocRecord[] {
    return MOCK_IDOC_RECORDS.map((record) => ({ ...record, history: [...record.history], retries: [...record.retries] }));
  },
  listAlerts(): IdocAlert[] {
    return MOCK_IDOC_ALERTS.map((alert) => ({ ...alert }));
  },
  listAlertRules(): IdocAlertRule[] {
    return MOCK_IDOC_ALERT_RULES.map((rule) => ({ ...rule }));
  },
  listReports(): IdocReportJob[] {
    return MOCK_IDOC_REPORTS.map((report) => ({ ...report }));
  },
};
