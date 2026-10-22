import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  activeFilterLabels,
  DEFAULT_FILTERS,
  environmentMatches,
  filterAlertsByTime,
  filterByEnvironment,
  hasActiveFilters,
  isWithinRange,
  normalizeFilters,
  scopeModules,
  spendInRange,
  systemFilterAvailable,
  timeRangeStartMs,
  spendRangeLabel,
  useDashboardFilters,
} from './dashboardFilters';
import type { DashboardSummary, SmartAlertItem } from './useDashboardData';

const NOW = new Date('2026-09-28T06:00:00Z');
const BOTH = { cloudCost: true, sapMonitoring: true };

describe('time range', () => {
  it('starts 1, 7 or 30 days before now, and has no start for All time', () => {
    expect(timeRangeStartMs('all', NOW)).toBeNull();
    expect(timeRangeStartMs('24h', NOW)).toBe(Date.parse('2026-09-27T06:00:00Z'));
    expect(timeRangeStartMs('7d', NOW)).toBe(Date.parse('2026-09-21T06:00:00Z'));
    expect(timeRangeStartMs('30d', NOW)).toBe(Date.parse('2026-08-29T06:00:00Z'));
  });

  it('keeps timestamps inside the window, drops older ones and drops ones it cannot read', () => {
    expect(isWithinRange('2026-09-27T08:00:00Z', '24h', NOW)).toBe(true);
    expect(isWithinRange('2026-09-26T22:00:00Z', '24h', NOW)).toBe(false);
    expect(isWithinRange('2026-09-22T00:00:00Z', '7d', NOW)).toBe(true);
    expect(isWithinRange('2026-09-10T00:00:00Z', '7d', NOW)).toBe(false);
    expect(isWithinRange(undefined, '7d', NOW)).toBe(false);
    expect(isWithinRange('not a date', '7d', NOW)).toBe(false);
  });

  it('lets everything through for All time, even a missing timestamp', () => {
    expect(isWithinRange(undefined, 'all', NOW)).toBe(true);
    expect(isWithinRange('2020-01-01T00:00:00Z', 'all', NOW)).toBe(true);
  });

  it('filters cloud alerts by their detection time', () => {
    const alerts: SmartAlertItem[] = [
      { id: 'a', detected_at: '2026-09-27T08:12:00Z' },
      { id: 'b', detected_at: '2026-09-24T16:45:00Z' },
      { id: 'c', detected_at: '2026-09-02T07:30:00Z' },
      { id: 'd' },
    ];
    expect(filterAlertsByTime(alerts, 'all', NOW).map((a) => a.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(filterAlertsByTime(alerts, '24h', NOW).map((a) => a.id)).toEqual(['a']);
    expect(filterAlertsByTime(alerts, '7d', NOW).map((a) => a.id)).toEqual(['a', 'b']);
    expect(filterAlertsByTime(alerts, '30d', NOW).map((a) => a.id)).toEqual(['a', 'b', 'c']);
  });

  it('labels the spend tile for the range', () => {
    expect(spendRangeLabel('24h')).toBe('Spend, latest day');
    expect(spendRangeLabel('7d')).toBe('Spend, last 7 days');
    expect(spendRangeLabel('30d')).toBe('Spend, last 30 days');
    expect(spendRangeLabel('all')).toBe('Spend, month to date');
  });
});

describe('spendInRange', () => {
  const daily = Array.from({ length: 40 }, (_, i) => ({ key: new Date(Date.UTC(2026, 7, 20 + i)).toISOString().slice(0, 10), total: 100 }));
  const summary: DashboardSummary = { daily };

  it('sums the newest 1, 7 or 30 daily rows', () => {
    expect(spendInRange(summary, '24h')).toEqual({ total: 100, days: 1 });
    expect(spendInRange(summary, '7d')).toEqual({ total: 700, days: 7 });
    expect(spendInRange(summary, '30d')).toEqual({ total: 3000, days: 30 });
  });

  it('is null for All time and when there is no daily series', () => {
    expect(spendInRange(summary, 'all')).toBeNull();
    expect(spendInRange({}, '7d')).toBeNull();
    expect(spendInRange(null, '7d')).toBeNull();
  });

  it('sums what exists when fewer days than the range are available, in date order', () => {
    const short: DashboardSummary = { daily: [{ key: '2026-09-02', total: 30 }, { key: '2026-09-01', total: 10 }, { key: '2026-09-03', total: 5 }] };
    expect(spendInRange(short, '7d')).toEqual({ total: 45, days: 3 });
    expect(spendInRange(short, '24h')).toEqual({ total: 5, days: 1 });
  });
});

describe('environment', () => {
  it('matches the system environment case-insensitively', () => {
    expect(environmentMatches('Production', 'production')).toBe(true);
    expect(environmentMatches('QA', 'qa')).toBe(true);
    expect(environmentMatches('Development', 'production')).toBe(false);
    expect(environmentMatches('anything', 'all')).toBe(true);
  });

  it('narrows SAP systems by their environment', () => {
    const systems = [
      { id: 'A', environment: 'Production' },
      { id: 'B', environment: 'QA' },
      { id: 'C', environment: 'Production' },
      { id: 'D', environment: 'Development' },
    ];
    expect(filterByEnvironment(systems, 'all')).toHaveLength(4);
    expect(filterByEnvironment(systems, 'production').map((s) => s.id)).toEqual(['A', 'C']);
    expect(filterByEnvironment(systems, 'qa').map((s) => s.id)).toEqual(['B']);
    expect(filterByEnvironment([{ id: 'X', environment: 'Sandbox' }], 'development')).toEqual([]);
  });
});

describe('system', () => {
  it('is offered only when both modules are subscribed', () => {
    expect(systemFilterAvailable(BOTH)).toBe(true);
    expect(systemFilterAvailable({ cloudCost: true, sapMonitoring: false })).toBe(false);
    expect(systemFilterAvailable({ cloudCost: false, sapMonitoring: true })).toBe(false);
  });

  it('keeps only the chosen half of the dashboard', () => {
    expect(scopeModules(BOTH, 'all')).toEqual(BOTH);
    expect(scopeModules(BOTH, 'sap')).toEqual({ cloudCost: false, sapMonitoring: true });
    expect(scopeModules(BOTH, 'cloud')).toEqual({ cloudCost: true, sapMonitoring: false });
  });

  it('never hides a module the organisation has just because a stale choice is remembered', () => {
    const cloudOnly = { cloudCost: true, sapMonitoring: false };
    const normalized = normalizeFilters({ ...DEFAULT_FILTERS, system: 'sap' }, cloudOnly);
    expect(normalized.system).toBe('all');
    expect(scopeModules(cloudOnly, normalized.system)).toEqual(cloudOnly);
    expect(normalizeFilters({ ...DEFAULT_FILTERS, system: 'sap' }, BOTH).system).toBe('sap');
  });
});

describe('active filters', () => {
  it('knows when everything is at its default', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
    expect(activeFilterLabels(DEFAULT_FILTERS)).toEqual([]);
  });

  it('names each filter that is on, in toolbar order', () => {
    const filters = { timeRange: '7d' as const, environment: 'production' as const, system: 'sap' as const };
    expect(hasActiveFilters(filters)).toBe(true);
    expect(activeFilterLabels(filters)).toEqual(['Last 7 days', 'Production', 'SAP']);
    expect(activeFilterLabels({ ...DEFAULT_FILTERS, environment: 'qa' })).toEqual(['QA']);
  });
});

describe('useDashboardFilters', () => {
  afterEach(() => sessionStorage.clear());

  it('starts at the defaults, changes one filter at a time and resets all of them', () => {
    const { result } = renderHook(() => useDashboardFilters(BOTH));
    expect(result.current.filters).toEqual(DEFAULT_FILTERS);
    expect(result.current.active).toBe(false);

    act(() => result.current.setTimeRange('7d'));
    act(() => result.current.setEnvironment('qa'));
    act(() => result.current.setSystem('sap'));
    expect(result.current.filters).toEqual({ timeRange: '7d', environment: 'qa', system: 'sap' });
    expect(result.current.active).toBe(true);
    expect(result.current.activeLabels).toEqual(['Last 7 days', 'QA', 'SAP']);

    act(() => result.current.reset());
    expect(result.current.filters).toEqual(DEFAULT_FILTERS);
    expect(result.current.active).toBe(false);
  });

  it('remembers the choice for the session', () => {
    const first = renderHook(() => useDashboardFilters(BOTH));
    act(() => first.result.current.setTimeRange('30d'));
    first.unmount();
    const second = renderHook(() => useDashboardFilters(BOTH));
    expect(second.result.current.filters.timeRange).toBe('30d');
  });

  it('ignores a stored value that is no longer an option', () => {
    sessionStorage.setItem('mv-remembered:dashboard:environment', JSON.stringify('staging'));
    const { result } = renderHook(() => useDashboardFilters(BOTH));
    expect(result.current.filters.environment).toBe('all');
  });

  it('hides the System select and ignores a remembered System choice with one module', () => {
    const { result } = renderHook(() => useDashboardFilters(BOTH));
    act(() => result.current.setSystem('sap'));
    const cloudOnly = renderHook(() => useDashboardFilters({ cloudCost: true, sapMonitoring: false }));
    expect(cloudOnly.result.current.showSystem).toBe(false);
    expect(cloudOnly.result.current.filters.system).toBe('all');
    expect(cloudOnly.result.current.active).toBe(false);
  });
});
