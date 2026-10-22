import { useCallback, useMemo } from 'react';
import { oneOf, useRememberedState } from '../../../shared/lib/useRememberedState';
import type { DashboardDailyRow, DashboardSummary, SmartAlertItem } from './useDashboardData';

/*
 * The dashboard's scope filters. Each one narrows something the data really has:
 *  - Time range: anything with a timestamp (cloud alerts by detected_at, SAP alerts by detectedAt, daily spend).
 *  - Environment: SAP systems, which carry an `environment` (Production / QA / Development). Cloud accounts and the
 *    other SAP findings (jobs, dumps, disks, notes, alerts) have no environment, so they are left as they are and the
 *    UI says so rather than pretending to split them.
 *  - System: which module's half of the dashboard is shown (SAP or Cloud).
 */

export type TimeRange = 'all' | '24h' | '7d' | '30d';
export type EnvironmentFilter = 'all' | 'production' | 'qa' | 'development';
export type SystemFilter = 'all' | 'sap' | 'cloud';

export interface DashboardFilters {
  timeRange: TimeRange;
  environment: EnvironmentFilter;
  system: SystemFilter;
}

export interface ModuleFlags {
  cloudCost: boolean;
  sapMonitoring: boolean;
}

export const DEFAULT_FILTERS: DashboardFilters = { timeRange: 'all', environment: 'all', system: 'all' };

export const TIME_RANGE_OPTIONS: Array<{ value: TimeRange; label: string }> = [
  { value: 'all', label: 'All time' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];
export const ENVIRONMENT_OPTIONS: Array<{ value: EnvironmentFilter; label: string }> = [
  { value: 'all', label: 'All Environments' },
  { value: 'production', label: 'Production' },
  { value: 'qa', label: 'QA' },
  { value: 'development', label: 'Development' },
];
export const SYSTEM_OPTIONS: Array<{ value: SystemFilter; label: string }> = [
  { value: 'all', label: 'All Systems' },
  { value: 'sap', label: 'SAP' },
  { value: 'cloud', label: 'Cloud' },
];

/** Shown where the Environment filter has no real basis (cloud accounts, non-system SAP findings). */
export const ENVIRONMENT_HINT = 'Applies to SAP systems';

const DAY_MS = 86_400_000;
const RANGE_DAYS: Record<Exclude<TimeRange, 'all'>, number> = { '24h': 1, '7d': 7, '30d': 30 };

/** Start of the range as epoch milliseconds, or null for "All time". */
export function timeRangeStartMs(range: TimeRange, now: Date): number | null {
  return range === 'all' ? null : now.getTime() - RANGE_DAYS[range] * DAY_MS;
}

/**
 * Whether a timestamp falls inside the range ending at `now`. With "All time" everything passes. With a range
 * active, a missing or unreadable timestamp cannot be placed in the window, so it does not pass.
 */
export function isWithinRange(timestamp: string | null | undefined, range: TimeRange, now: Date): boolean {
  const start = timeRangeStartMs(range, now);
  if (start === null) return true;
  if (!timestamp) return false;
  const at = Date.parse(timestamp);
  return Number.isFinite(at) && at >= start;
}

/** Cloud alerts detected inside the range. */
export function filterAlertsByTime(alerts: SmartAlertItem[], range: TimeRange, now: Date): SmartAlertItem[] {
  return range === 'all' ? alerts : alerts.filter((alert) => isWithinRange(alert.detected_at, range, now));
}

/** Whether a SAP system's environment ("Production", "QA", ...) is the selected one. */
export function environmentMatches(systemEnvironment: string, filter: EnvironmentFilter): boolean {
  return filter === 'all' || systemEnvironment.trim().toLowerCase() === filter;
}

export function filterByEnvironment<T extends { environment: string }>(systems: T[], filter: EnvironmentFilter): T[] {
  return filter === 'all' ? systems : systems.filter((system) => environmentMatches(system.environment, filter));
}

/** The System filter only exists when both modules are subscribed; with one module there is nothing to choose. */
export function systemFilterAvailable(modules: ModuleFlags): boolean {
  return modules.cloudCost && modules.sapMonitoring;
}

/** Filters as they apply to this organisation: a remembered System choice is ignored when only one module is subscribed. */
export function normalizeFilters(filters: DashboardFilters, modules: ModuleFlags): DashboardFilters {
  return systemFilterAvailable(modules) ? filters : { ...filters, system: 'all' };
}

/** The modules left showing once the System filter is applied. */
export function scopeModules(modules: ModuleFlags, system: SystemFilter): ModuleFlags {
  return {
    cloudCost: modules.cloudCost && system !== 'sap',
    sapMonitoring: modules.sapMonitoring && system !== 'cloud',
  };
}

export function hasActiveFilters(filters: DashboardFilters): boolean {
  return filters.timeRange !== DEFAULT_FILTERS.timeRange
    || filters.environment !== DEFAULT_FILTERS.environment
    || filters.system !== DEFAULT_FILTERS.system;
}

const labelOf = <T extends string>(options: Array<{ value: T; label: string }>, value: T) => options.find((o) => o.value === value)?.label ?? value;

/** Words for each filter that is not at its default, in toolbar order ("Last 7 days", "Production", "SAP"). */
export function activeFilterLabels(filters: DashboardFilters): string[] {
  const labels: string[] = [];
  if (filters.timeRange !== DEFAULT_FILTERS.timeRange) labels.push(labelOf(TIME_RANGE_OPTIONS, filters.timeRange));
  if (filters.environment !== DEFAULT_FILTERS.environment) labels.push(labelOf(ENVIRONMENT_OPTIONS, filters.environment));
  if (filters.system !== DEFAULT_FILTERS.system) labels.push(labelOf(SYSTEM_OPTIONS, filters.system));
  return labels;
}

/** Tile label for spend over the range ("Last 24 Hours" is the latest day: spend is recorded per day). */
export function spendRangeLabel(range: TimeRange): string {
  return range === '24h' ? 'Spend, latest day' : range === '7d' ? 'Spend, last 7 days' : range === '30d' ? 'Spend, last 30 days' : 'Spend, month to date';
}

export interface RangeSpend {
  total: number;
  days: number;
}

/**
 * Spend over the range, summed from the newest daily rows (the daily series ends at the latest day with data).
 * Null for "All time" (the dashboard then keeps its month-to-date figure) and when the API sends no daily series.
 * "Last 24 Hours" is the latest day, since spend is recorded per day.
 */
export function spendInRange(summary: DashboardSummary | null, range: TimeRange): RangeSpend | null {
  if (range === 'all') return null;
  const daily: DashboardDailyRow[] = Array.isArray(summary?.daily) ? summary.daily : [];
  const rows = daily
    .filter((row) => row && typeof row.key === 'string' && Number.isFinite(Number(row.total)))
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-RANGE_DAYS[range]);
  if (rows.length === 0) return null;
  const total = Math.round(rows.reduce((sum, row) => sum + Number(row.total), 0) * 100) / 100;
  return { total, days: rows.length };
}

export interface DashboardFilterState {
  /** The filters in force (a System choice is dropped when only one module is subscribed). */
  filters: DashboardFilters;
  setTimeRange: (value: TimeRange) => void;
  setEnvironment: (value: EnvironmentFilter) => void;
  setSystem: (value: SystemFilter) => void;
  reset: () => void;
  /** Words for the filters that are on; empty when everything is at its default. */
  activeLabels: string[];
  active: boolean;
  /** Whether the System select is offered. */
  showSystem: boolean;
}

/**
 * The three filters, remembered for the browser session (so they survive moving between pages and are cleared on
 * sign-out, i.e. per user). Owned by the page that applies them and handed to the toolbar to show.
 */
export function useDashboardFilters(modules: ModuleFlags): DashboardFilterState {
  const [timeRange, setTimeRange] = useRememberedState<TimeRange>('dashboard', 'time-range-v2', DEFAULT_FILTERS.timeRange, oneOf(TIME_RANGE_OPTIONS.map((o) => o.value)));
  const [environment, setEnvironment] = useRememberedState<EnvironmentFilter>('dashboard', 'environment', DEFAULT_FILTERS.environment, oneOf(ENVIRONMENT_OPTIONS.map((o) => o.value)));
  const [system, setSystem] = useRememberedState<SystemFilter>('dashboard', 'system', DEFAULT_FILTERS.system, oneOf(SYSTEM_OPTIONS.map((o) => o.value)));
  const showSystem = systemFilterAvailable(modules);
  const filters = useMemo(() => normalizeFilters({ timeRange, environment, system }, modules), [timeRange, environment, system, modules]);
  const reset = useCallback(() => {
    setTimeRange(DEFAULT_FILTERS.timeRange);
    setEnvironment(DEFAULT_FILTERS.environment);
    setSystem(DEFAULT_FILTERS.system);
  }, [setTimeRange, setEnvironment, setSystem]);
  const activeLabels = useMemo(() => activeFilterLabels(filters), [filters]);
  return { filters, setTimeRange, setEnvironment, setSystem, reset, activeLabels, active: activeLabels.length > 0, showSystem };
}
