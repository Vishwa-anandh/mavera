import { auditRepository, type AuditEventInput, type AuditEventRecord } from '../../../data-access';

/**
 * Appends an event to the audit trail, attributed to the signed-in member unless `actor` is given.
 * Any feature may call this after a meaningful action (a budget created, an alert resolved, a
 * system connected); it is fire-and-forget and never throws.
 *
 *   recordAuditEvent({ action: 'Budget created', target: 'AWS production · $18,000 / month', module: 'Budgets' });
 */
export function recordAuditEvent(input: AuditEventInput): AuditEventRecord | null {
  try {
    return auditRepository.append(input);
  } catch {
    return null;
  }
}
