import type { IdocAlert, IdocAlertRule, IdocRecord, IdocReportJob } from '../../data-access';

/**
 * PROTOTYPE MOCK DATA — a sample of recent IDocs from one SAP system (GRC, client 200), shaped
 * like SAP's control/status records. Times are relative to page load so "last 24 hours" views
 * stay meaningful. Status texts follow standard SAP IDoc status meanings; error messages are
 * invented but typical. None of this is live integration data.
 */
const NOW = Date.now();
const minutesAgo = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

interface Scenario {
  count: number;
  direction: IdocRecord['direction'];
  messageType: string;
  basicType: string;
  partners: Array<{ id: string; type: IdocRecord['partnerType'] }>;
  /** Final (current) status code. */
  code: string;
  text: (n: number) => string;
  category?: string;
  /** Status codes passed through before the current one. */
  path: string[];
  /** Spread of ages, in minutes, for the records in this scenario. */
  ageFrom: number;
  ageTo: number;
  /** How many of these were retried, and how the last retry ended. */
  retried?: number;
  retryResult?: 'Pending' | 'Failed' | 'Succeeded';
  /** Processing time in seconds, for completed records. */
  seconds?: number;
}

const LS_MST = { id: 'MSTCLNT200', type: 'LS' as const };
const LS_S4H = { id: 'S4HCLNT100', type: 'LS' as const };
const KU_100000 = { id: '100000', type: 'KU' as const };
const KU_100045 = { id: '100045', type: 'KU' as const };
const LI_VENDOR = { id: '1', type: 'LI' as const };
const LI_CARRIER = { id: 'CARRIER02', type: 'LI' as const };

const SCENARIOS: Scenario[] = [
  // Inbound — posted.
  { count: 2, direction: 'Inbound', messageType: 'ORDERS', basicType: 'ORDERS05', partners: [LS_MST], code: '53', text: () => 'Application document posted', path: ['50', '64', '62'], ageFrom: 40, ageTo: 300, seconds: 18 },
  // Inbound — application errors.
  { count: 9, direction: 'Inbound', messageType: 'ORDERS', basicType: 'ORDERS05', partners: [LS_MST, KU_100000], code: '51', text: (n) => `Customer ${100040 + n} is not maintained in sales organization 1000`, category: 'Master data', path: ['50', '64', '62'], ageFrom: 6, ageTo: 9000, retried: 7, retryResult: 'Failed' },
  { count: 6, direction: 'Inbound', messageType: 'ORDERS', basicType: 'ORDERS05', partners: [LS_MST], code: '51', text: (n) => `Material MAT-${7300 + n * 7} does not exist in plant 1000`, category: 'Master data', path: ['50', '64', '62'], ageFrom: 25, ageTo: 5000, retried: 4, retryResult: 'Failed' },
  { count: 4, direction: 'Inbound', messageType: 'DEBCOR', basicType: 'DEBCOR02', partners: [KU_100000, KU_100045], code: '51', text: () => 'Partner function SH (ship-to) missing for sold-to party', category: 'Master data', path: ['50', '64', '62'], ageFrom: 60, ageTo: 7000, retried: 3, retryResult: 'Failed' },
  { count: 3, direction: 'Inbound', messageType: 'ORDERS', basicType: 'ORDERS05', partners: [LS_MST], code: '51', text: () => 'Pricing error: condition type PR00 is missing', category: 'Pricing', path: ['50', '64', '62'], ageFrom: 90, ageTo: 3000, retried: 2, retryResult: 'Pending' },
  { count: 4, direction: 'Inbound', messageType: 'DEBCOR', basicType: 'DEBCOR02', partners: [LS_S4H], code: '56', text: () => 'Partner profile not available for partner S4HCLNT100 (LS)', category: 'Partner profile', path: ['50'], ageFrom: 120, ageTo: 12000, retried: 2, retryResult: 'Failed' },
  // Inbound — waiting / processing / unmapped.
  { count: 3, direction: 'Inbound', messageType: 'ORDERS', basicType: 'ORDERS05', partners: [LS_MST], code: '64', text: () => 'IDoc ready to be transferred to application', path: ['50'], ageFrom: 95, ageTo: 1560 },
  { count: 1, direction: 'Inbound', messageType: 'DEBCOR', basicType: 'DEBCOR02', partners: [KU_100045], code: '66', text: () => 'IDoc is waiting for predecessor IDoc (serialization)', path: ['50'], ageFrom: 210, ageTo: 210 },
  { count: 1, direction: 'Inbound', messageType: 'ORDERS', basicType: 'ORDERS05', partners: [LS_MST], code: '62', text: () => 'IDoc passed to application', path: ['50', '64'], ageFrom: 3, ageTo: 3 },
  { count: 1, direction: 'Inbound', messageType: 'MATMAS', basicType: 'MATMAS05', partners: [LS_S4H], code: '75', text: () => 'IDoc is in inbound queue', path: ['50'], ageFrom: 48, ageTo: 48 },
  // Outbound — dispatched.
  { count: 2, direction: 'Outbound', messageType: 'INVOIC', basicType: 'INVOIC02', partners: [LI_VENDOR], code: '12', text: () => 'Dispatch OK', path: ['01', '30', '03'], ageFrom: 30, ageTo: 600, seconds: 6 },
  { count: 2, direction: 'Outbound', messageType: 'DESADV', basicType: 'DELVRY07', partners: [LI_CARRIER], code: '03', text: () => 'Data passed to port OK', path: ['01', '30'], ageFrom: 15, ageTo: 400, seconds: 4 },
  // Outbound — errors.
  { count: 2, direction: 'Outbound', messageType: 'INVOIC', basicType: 'INVOIC02', partners: [LI_VENDOR], code: '26', text: () => 'Error during syntax check: mandatory segment E1EDK01 missing', category: 'Syntax', path: ['01'], ageFrom: 70, ageTo: 2500, retried: 1, retryResult: 'Failed' },
  { count: 1, direction: 'Outbound', messageType: 'DESADV', basicType: 'DELVRY07', partners: [LI_CARRIER], code: '02', text: () => 'Error passing data to port A000000016: RFC destination unreachable', category: 'Connectivity', path: ['01', '30'], ageFrom: 22, ageTo: 22, retried: 1, retryResult: 'Pending' },
  { count: 1, direction: 'Outbound', messageType: 'ORDERS', basicType: 'ORDERS05', partners: [LS_S4H], code: '29', text: () => 'Error in ALE service: receiver not determined in distribution model', category: 'Configuration', path: ['01'], ageFrom: 400, ageTo: 400 },
  // Outbound — waiting for dispatch.
  { count: 2, direction: 'Outbound', messageType: 'INVOIC', basicType: 'INVOIC02', partners: [LI_VENDOR], code: '30', text: () => 'IDoc ready for dispatch (ALE service)', path: ['01'], ageFrom: 35, ageTo: 760 },
];

const STATUS_TEXT: Record<string, string> = {
  '01': 'IDoc generated', '30': 'IDoc ready for dispatch (ALE service)', '03': 'Data passed to port OK',
  '50': 'IDoc added', '64': 'IDoc ready to be transferred to application', '62': 'IDoc passed to application',
};

let sequence = 1234500;

export const MOCK_IDOC_RECORDS: IdocRecord[] = SCENARIOS.flatMap((scenario) =>
  Array.from({ length: scenario.count }, (_, n) => {
    sequence += 7;
    const age = scenario.count === 1 ? scenario.ageFrom : Math.round(scenario.ageFrom + ((scenario.ageTo - scenario.ageFrom) * n) / (scenario.count - 1));
    const created = NOW - age * 60_000;
    const partner = scenario.partners[n % scenario.partners.length];
    const steps = [...scenario.path, scenario.code];
    const history = steps.map((code, i) => ({
      at: new Date(created + i * 20_000).toISOString(),
      code,
      text: i === steps.length - 1 ? scenario.text(n) : STATUS_TEXT[code],
    }));
    const retried = n < (scenario.retried ?? 0);
    const retries = retried
      ? [{ at: new Date(created + Math.min(age * 30_000, 3_600_000)).toISOString(), result: n === 0 && scenario.retryResult === 'Pending' ? 'Pending' as const : 'Failed' as const, code: n === 0 && scenario.retryResult === 'Pending' ? undefined : scenario.code }]
      : [];
    const inbound = scenario.direction === 'Inbound';
    const updatedAt = retries.length ? retries[retries.length - 1].at : history[history.length - 1].at;
    return {
      docnum: String(sequence).padStart(16, '0'),
      direction: scenario.direction,
      system: 'GRC',
      client: '200',
      messageType: scenario.messageType,
      basicType: scenario.basicType,
      partner: partner.id,
      partnerType: partner.type,
      senderPort: inbound ? 'A000000016' : 'SAPGRC',
      receiverPort: inbound ? 'SAPGRC' : 'A000000016',
      statusCode: scenario.code,
      statusText: scenario.text(n),
      errorCategory: scenario.category,
      createdAt: new Date(created).toISOString(),
      updatedAt,
      durationSeconds: scenario.seconds ?? null,
      history,
      retries,
    } satisfies IdocRecord;
  }),
).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const MOCK_IDOC_ALERTS: IdocAlert[] = [
  { id: 'ia-1', severity: 'Critical', summary: 'Failure rate for ORDERS from MSTCLNT200 above 50% in the last hour', source: 'Failure-rate rule', docnums: MOCK_IDOC_RECORDS.filter((r) => r.statusCode === '51' && r.partner === 'MSTCLNT200').slice(0, 3).map((r) => r.docnum), lifecycle: 'Open', raisedAt: minutesAgo(12) },
  { id: 'ia-2', severity: 'High', summary: 'Port A000000016 rejected an outbound DESADV (RFC destination unreachable)', source: 'Dispatch errors', docnums: MOCK_IDOC_RECORDS.filter((r) => r.statusCode === '02').map((r) => r.docnum), lifecycle: 'Open', raisedAt: minutesAgo(21) },
  { id: 'ia-3', severity: 'Medium', summary: '3 inbound IDocs waiting more than 1 hour in status 64', source: 'Backlog age rule', docnums: MOCK_IDOC_RECORDS.filter((r) => r.statusCode === '64').map((r) => r.docnum), lifecycle: 'Acknowledged', raisedAt: minutesAgo(95) },
  { id: 'ia-4', severity: 'Low', summary: 'Partner profile missing for S4HCLNT100 (LS)', source: 'Configuration check', docnums: MOCK_IDOC_RECORDS.filter((r) => r.statusCode === '56').map((r) => r.docnum), lifecycle: 'Resolved', raisedAt: minutesAgo(60 * 26) },
];

export const MOCK_IDOC_ALERT_RULES: IdocAlertRule[] = [
  { id: 'rule-failure-rate', name: 'Failure rate', description: 'Alert when more than 20% of a partner/message type fails within an hour.', enabled: true },
  { id: 'rule-backlog', name: 'Backlog age', description: 'Alert when an IDoc waits longer than 60 minutes in a ready or waiting status.', enabled: true },
  { id: 'rule-dispatch', name: 'Dispatch errors', description: 'Alert on any outbound IDoc that fails to reach its port.', enabled: true },
  { id: 'rule-silence', name: 'Partner silence', description: 'Alert when an expected partner sends nothing for 24 hours.', enabled: false },
];

export const MOCK_IDOC_REPORTS: IdocReportJob[] = [
  { id: 'rep-1', name: 'Daily IDoc summary', scope: 'GRC · client 200 · all directions', period: 'Yesterday', status: 'Ready', generatedAt: minutesAgo(60 * 9) },
  { id: 'rep-2', name: 'Failed IDocs by partner', scope: 'GRC · client 200 · inbound', period: 'Last 7 days', status: 'Ready', generatedAt: minutesAgo(60 * 30) },
  { id: 'rep-3', name: 'Monthly throughput', scope: 'GRC · client 200 · all directions', period: 'September 2026', status: 'Failed', generatedAt: null },
];
