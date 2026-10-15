import { useState } from 'react';
import { oneOf, useRememberedState } from '../../../shared/lib/useRememberedState';
import { SearchIcon, RefreshIcon } from '../../../shared/ui/icons';
import { Select } from '../../../shared/ui/Select';

interface DashboardToolbarProps {
  onRefresh: () => void;
}

const TIME_RANGE_OPTIONS = [
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];
const ENVIRONMENT_OPTIONS = [
  { value: 'all', label: 'All Environments' },
  { value: 'production', label: 'Production' },
  { value: 'qa', label: 'QA' },
  { value: 'development', label: 'Development' },
];
const SYSTEM_OPTIONS = [
  { value: 'all', label: 'All Systems' },
  { value: 'sap', label: 'SAP' },
  { value: 'cloud', label: 'Cloud' },
];

/**
 * Search plus a scope/filter row (MAVERA_DESIGN_SYSTEM.md §6.2: "context
 * bar contains date range, time zone, environment, system/subscription
 * selection and refresh controls"). The three selects are presentational —
 * this prototype has one fixed mock dataset per module, so changing them
 * doesn't refetch anything; Refresh is real and re-runs the actual queries.
 */
export function DashboardToolbar({ onRefresh }: DashboardToolbarProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useRememberedState('dashboard', 'time-range', '24h', oneOf(TIME_RANGE_OPTIONS.map((o) => o.value)));
  const [environment, setEnvironment] = useRememberedState('dashboard', 'environment', 'all', oneOf(ENVIRONMENT_OPTIONS.map((o) => o.value)));
  const [system, setSystem] = useRememberedState('dashboard', 'system', 'all', oneOf(SYSTEM_OPTIONS.map((o) => o.value)));

  const handleRefresh = () => {
    setRefreshing(true);
    onRefresh();
    window.setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <div className="mv-dashboard-toolbar">
      <div className="mv-dashboard-search">
        <SearchIcon size={18} />
        <input type="search" aria-label="Search systems, resources, alerts" placeholder="Search systems, resources, alerts…" />
      </div>
      <div className="mv-dashboard-filters">
        <Select label="Time range" hideLabel value={timeRange} onChange={setTimeRange} options={TIME_RANGE_OPTIONS} />
        <Select label="Environment" hideLabel value={environment} onChange={setEnvironment} options={ENVIRONMENT_OPTIONS} />
        <Select label="System" hideLabel value={system} onChange={setSystem} options={SYSTEM_OPTIONS} />
        <button type="button" className="mv-primary-button" onClick={handleRefresh} disabled={refreshing}>
          <RefreshIcon size={16} style={{ marginRight: 6 }} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}
