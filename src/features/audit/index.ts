/* Public API of the audit feature. Other features and app/ import only from here. */
export { AuditTrailPage } from './pages/AuditTrailPage';
export { recordAuditEvent } from './model/recordAuditEvent';
export type { AuditEventInput, AuditEventRecord } from '../../data-access';
