import { describe, expect, it } from 'vitest';
import type { AuditEventRecord } from '../../../data-access';
import {
  NO_FILTERS,
  actorCounts,
  auditModules,
  dayLabel,
  eventsToCsvRows,
  filterEvents,
  groupByDay,
  hasActiveFilters,
  localDateKey,
} from './auditDerivations';

const NOW = new Date(2026, 9, 16, 12, 0, 0);
const at = (daysAgo: number, hour = 9) => new Date(2026, 9, 16 - daysAgo, hour, 0, 0).toISOString();

const event = (over: Partial<AuditEventRecord>): AuditEventRecord => ({
  id: 'e', at: at(0), actorName: 'Sarah Johnson', actorEmail: 's@x.com', actorKind: 'admin', actorRole: 'Admin',
  action: 'Role changed', target: 'marcus@x.com', module: 'Access control', result: 'success', ...over,
});

const feed = [
  event({ id: '1', at: at(0, 11) }),
  event({ id: '2', at: at(0, 8), actorName: 'Tom Wu', actorKind: 'member', actorRole: 'SAP Operator', action: 'Alert resolved', target: 'GRH', module: 'SAP Monitoring' }),
  event({ id: '3', at: at(1), actorName: 'Marcus Chen', actorKind: 'member', actorRole: 'Analyst', action: 'Budget created', target: 'AWS production', module: 'Budgets', detail: 'Alerts at 80%' }),
  event({ id: '4', at: at(5), action: 'Signed in', module: 'Authentication', result: 'failure', changes: [{ field: 'Role', before: 'Viewer', after: 'Analyst' }] }),
];

describe('filterEvents', () => {
  it('filters by actor type', () => {
    expect(filterEvents(feed, { ...NO_FILTERS, actor: 'member' }).map((e) => e.id)).toEqual(['2', '3']);
    expect(filterEvents(feed, { ...NO_FILTERS, actor: 'admin' }).map((e) => e.id)).toEqual(['1', '4']);
    expect(filterEvents(feed, NO_FILTERS)).toHaveLength(4);
  });

  it('filters by module and by an inclusive date range', () => {
    expect(filterEvents(feed, { ...NO_FILTERS, module: 'Budgets' }).map((e) => e.id)).toEqual(['3']);
    const from = localDateKey(new Date(at(1)));
    const to = localDateKey(new Date(at(0)));
    expect(filterEvents(feed, { ...NO_FILTERS, from, to }).map((e) => e.id)).toEqual(['1', '2', '3']);
    expect(filterEvents(feed, { ...NO_FILTERS, from: localDateKey(new Date(at(0))) }).map((e) => e.id)).toEqual(['1', '2']);
  });

  it('searches every word across actor, action, target, module and detail, case-insensitively', () => {
    expect(filterEvents(feed, { ...NO_FILTERS, query: 'aws budget' }).map((e) => e.id)).toEqual(['3']);
    expect(filterEvents(feed, { ...NO_FILTERS, query: 'TOM resolved' }).map((e) => e.id)).toEqual(['2']);
    expect(filterEvents(feed, { ...NO_FILTERS, query: '80%' }).map((e) => e.id)).toEqual(['3']);
    expect(filterEvents(feed, { ...NO_FILTERS, query: 'nothing like this' })).toEqual([]);
  });

  it('knows when any filter is active', () => {
    expect(hasActiveFilters(NO_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...NO_FILTERS, query: '  ' })).toBe(false);
    expect(hasActiveFilters({ ...NO_FILTERS, actor: 'admin' })).toBe(true);
  });
});

describe('groupByDay', () => {
  it('groups consecutive events by local day with Today and Yesterday labels', () => {
    const groups = groupByDay(feed, NOW);
    expect(groups.map((g) => [g.label, g.events.length])).toEqual([
      ['Today', 2],
      ['Yesterday', 1],
      [dayLabel(localDateKey(new Date(at(5))), NOW), 1],
    ]);
    expect(groups[2].label).toMatch(/Sat|Sun|Mon|Tue|Wed|Thu|Fri/);
  });

  it('returns nothing for an empty feed', () => {
    expect(groupByDay([], NOW)).toEqual([]);
  });
});

describe('helpers', () => {
  it('lists distinct modules alphabetically and counts admins and members', () => {
    expect(auditModules(feed)).toEqual(['Access control', 'Authentication', 'Budgets', 'SAP Monitoring']);
    expect(actorCounts(feed)).toEqual({ admin: 2, member: 2 });
  });

  it('builds CSV rows with readable results and a flattened before and after', () => {
    const rows = eventsToCsvRows([feed[3]]);
    expect(rows[0]).toEqual(expect.arrayContaining(['Failed', 'Signed in', 'Role: Viewer -> Analyst', 'Admin']));
    expect(rows[0]).toHaveLength(13);
  });
});
