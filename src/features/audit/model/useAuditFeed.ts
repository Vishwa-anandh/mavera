import { useSyncExternalStore } from 'react';
import { auditRepository, type AuditEventRecord } from '../../../data-access';

/** The audit feed, newest first; re-renders when an event is recorded or the feed is re-synced. */
export function useAuditFeed(): readonly AuditEventRecord[] {
  return useSyncExternalStore(auditRepository.subscribe, auditRepository.getSnapshot, auditRepository.getSnapshot);
}
