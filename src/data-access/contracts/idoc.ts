/**
 * IDoc record contract the IDoc Monitoring pages read. Mirrors what an SAP IDoc monitor exposes
 * (EDIDC control record + EDIDS status records). IDs stay strings so leading zeros survive
 * (MAVERA_DESIGN_SYSTEM.md §14). No backend contract is verified yet; see idocRepository.
 */
export type IdocDirection = 'Inbound' | 'Outbound';

export interface IdocStatusEvent {
  /** ISO timestamp. */
  at: string;
  /** SAP technical status code, e.g. "51". */
  code: string;
  /** The status text SAP recorded with the event, when there is one. */
  text?: string;
}

export interface IdocRetry {
  at: string;
  /** A submitted retry is Pending until SAP reports a new status — never assumed successful. */
  result: 'Pending' | 'Succeeded' | 'Failed';
  /** Status the retry ended in, once known. */
  code?: string;
}

export interface IdocRecord {
  /** IDoc number, 16 digits with leading zeros. */
  docnum: string;
  direction: IdocDirection;
  system: string;
  client: string;
  messageType: string;
  basicType: string;
  partner: string;
  /** SAP partner type: LS logical system, KU customer, LI vendor. */
  partnerType: 'LS' | 'KU' | 'LI';
  senderPort: string;
  receiverPort: string;
  statusCode: string;
  statusText: string;
  /** Grouping of the failure reason, for error-category filters. Only on failed records. */
  errorCategory?: string;
  createdAt: string;
  updatedAt: string;
  /** Seconds from creation to the final status; null while still open or when unmeasured. */
  durationSeconds: number | null;
  history: IdocStatusEvent[];
  retries: IdocRetry[];
}

export interface IdocAlert {
  id: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  summary: string;
  source: string;
  /** Records the alert was raised for. */
  docnums: string[];
  lifecycle: 'Open' | 'Acknowledged' | 'Resolved';
  raisedAt: string;
}

export interface IdocAlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface IdocReportJob {
  id: string;
  name: string;
  scope: string;
  period: string;
  status: 'Ready' | 'Running' | 'Failed';
  generatedAt: string | null;
}
