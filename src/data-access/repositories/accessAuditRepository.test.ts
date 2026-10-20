import { beforeEach, describe, expect, it, vi } from 'vitest';
import { accessRepository } from './accessRepository';
import { auditRepository } from './auditRepository';

beforeEach(() => {
  accessRepository.reset();
  auditRepository.reset();
});

describe('accessRepository', () => {
  it('seeds members and custom roles, and replaces the snapshot on every write so subscribers can detect changes', () => {
    const listener = vi.fn();
    const unsubscribe = accessRepository.subscribe(listener);
    const before = accessRepository.getSnapshot();
    expect(before.members.length).toBeGreaterThan(3);
    expect(before.customRoles.map((r) => r.id)).toEqual(['role-cost-auditor', 'role-sap-operator']);
    accessRepository.updateMember('user-marcus', { alertsEnabled: false });
    const after = accessRepository.getSnapshot();
    expect(after).not.toBe(before);
    expect(after.members.find((m) => m.userId === 'user-marcus')?.alertsEnabled).toBe(false);
    expect(before.members.find((m) => m.userId === 'user-marcus')?.alertsEnabled).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    accessRepository.updateMember('user-marcus', { alertsEnabled: true });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('adds the signed-in user once, at the top', () => {
    const self = { userId: 'me', fullName: 'Me', email: 'me@x.com', role: 'owner' as const, roleId: 'owner', status: 'active' as const };
    accessRepository.ensureMember(self);
    accessRepository.ensureMember({ ...self, fullName: 'Changed' });
    const members = accessRepository.getSnapshot().members;
    expect(members.filter((m) => m.userId === 'me')).toHaveLength(1);
    expect(members[0].fullName).toBe('Me');
  });

  it('creates, updates and deletes custom roles without touching the seed', () => {
    const now = new Date().toISOString();
    accessRepository.createRole({ id: 'r1', name: 'R1', description: '', permissions: { dashboard: ['VIEW'] }, createdAt: now, updatedAt: now, updatedBy: 'x' });
    accessRepository.updateRole('r1', { name: 'Renamed' });
    expect(accessRepository.getSnapshot().customRoles.find((r) => r.id === 'r1')?.name).toBe('Renamed');
    accessRepository.deleteRole('r1');
    expect(accessRepository.getSnapshot().customRoles.some((r) => r.id === 'r1')).toBe(false);
    accessRepository.reset();
    expect(accessRepository.getSnapshot().customRoles).toHaveLength(2);
  });
});

describe('auditRepository', () => {
  it('seeds a newest-first feed spanning many days', () => {
    const events = auditRepository.getSnapshot();
    expect(events.length).toBeGreaterThanOrEqual(25);
    expect(events.map((e) => e.at)).toEqual([...events.map((e) => e.at)].sort().reverse());
    expect(events.some((e) => e.changes && e.changes.length > 0)).toBe(true);
    expect(new Set(events.map((e) => e.at.slice(0, 10))).size).toBeGreaterThan(5);
  });

  it('appends events attributed to the current actor, newest first, and lets an explicit actor override', () => {
    auditRepository.setActor({ name: 'Dev Preview', email: 'demo@mavera.local', kind: 'admin', role: 'Owner' });
    const record = auditRepository.append({ action: 'Budget created', target: 'AWS', module: 'Budgets' });
    expect(auditRepository.getSnapshot()[0]).toBe(record);
    expect(record).toMatchObject({ actorName: 'Dev Preview', actorKind: 'admin', actorRole: 'Owner', result: 'success' });
    const other = auditRepository.append({ action: 'Signed in', target: 't', module: 'Authentication', actor: { name: 'Tom', email: 't@x.com', kind: 'member', role: 'Viewer' } });
    expect(other.actorName).toBe('Tom');
    expect(new Set(auditRepository.getSnapshot().map((e) => e.id)).size).toBe(auditRepository.getSnapshot().length);
  });

  it('re-sync delivers up to two pending events, then reports nothing new', () => {
    const start = auditRepository.getSnapshot().length;
    expect(auditRepository.resync()).toBe(2);
    expect(auditRepository.resync()).toBe(2);
    expect(auditRepository.resync()).toBe(0);
    expect(auditRepository.getSnapshot().length).toBe(start + 4);
  });
});
