import type { AuditActor, AuditEventInput, AuditEventRecord } from '../contracts/access';
import { buildPendingAuditEvents, buildSeedAuditEvents } from '../../demo/audit/mockAuditData';
import { getWorkspaceProfile, onWorkspaceProfileChange } from './workspaceProfile';

/**
 * The audit feed.
 * PROTOTYPE: seeded sample events plus whatever the session records, held in memory. Swap for the
 * audit endpoints when they exist. The snapshot is replaced, never mutated, on every write.
 */
const FALLBACK_ACTOR: AuditActor = { name: 'Unknown user', email: '', kind: 'member', role: 'Member' };

/** A brand-new organisation (empty profile) has no history: the feed fills as its owner acts. */
const seedEvents = (): readonly AuditEventRecord[] => (getWorkspaceProfile() === 'empty' ? [] : buildSeedAuditEvents(new Date()));
const seedPending = () => (getWorkspaceProfile() === 'empty' ? [] : buildPendingAuditEvents());

let events: readonly AuditEventRecord[] = seedEvents();
let pending = seedPending();
let actor: AuditActor = FALLBACK_ACTOR;
let counter = 0;
const listeners = new Set<() => void>();

function commit(next: readonly AuditEventRecord[]): void {
  events = next;
  listeners.forEach((listener) => listener());
}

function nextId(): string {
  counter += 1;
  return `aud-${Date.now().toString(36)}-${counter}`;
}

export const auditRepository = {
  getSnapshot(): readonly AuditEventRecord[] {
    return events;
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Who the session's events are recorded as; set when the signed-in member is known. */
  setActor(next: AuditActor | null): void {
    actor = next ?? FALLBACK_ACTOR;
  },
  getActor(): AuditActor {
    return actor;
  },
  append(input: AuditEventInput): AuditEventRecord {
    const who = input.actor ?? actor;
    const { actor: _ignored, at, result, ...rest } = input;
    const record: AuditEventRecord = {
      ...rest,
      id: nextId(),
      at: at ?? new Date().toISOString(),
      result: result ?? 'success',
      actorName: who.name,
      actorEmail: who.email,
      actorKind: who.kind,
      actorRole: who.role,
    };
    commit([record, ...events].sort((a, b) => b.at.localeCompare(a.at)));
    return record;
  },
  /** Simulates pulling new events from the audit service: delivers up to two pending ones. Returns how many arrived. */
  resync(): number {
    const arrived = pending.slice(0, 2);
    pending = pending.slice(arrived.length);
    if (arrived.length === 0) return 0;
    const now = Date.now();
    const records = arrived.map((event, index): AuditEventRecord => ({ ...event, id: nextId(), at: new Date(now - index * 1000).toISOString() }));
    commit([...records, ...events].sort((a, b) => b.at.localeCompare(a.at)));
    return arrived.length;
  },
  reset(): void {
    events = seedEvents();
    pending = seedPending();
    actor = FALLBACK_ACTOR;
    commit(events);
  },
};

onWorkspaceProfileChange(() => auditRepository.reset());
