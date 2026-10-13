import type { IdocRecord } from '../../../data-access';
import { downloadCsv } from '../../../shared/lib/csv';
import { statusInfo } from './idocStatus';

/** Downloads IDoc records as CSV; IDoc numbers keep their leading zeros. */
export function exportIdocs(filename: string, records: IdocRecord[]) {
  downloadCsv(filename, ['IDoc number', 'Direction', 'System', 'Client', 'Message type', 'Basic type', 'Partner', 'Partner type', 'Status', 'Status meaning', 'Status text', 'Created', 'Last update'],
    records.map((r) => [r.docnum, r.direction, r.system, r.client, r.messageType, r.basicType, r.partner, r.partnerType, r.statusCode, statusInfo(r.statusCode).description, r.statusText, r.createdAt, r.updatedAt]));
}
