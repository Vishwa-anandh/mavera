import { useState } from 'react';
import { RefreshIcon, SearchIcon } from '../../../shared/ui/icons';
import { PageTourButton } from '../../../shared/ui/PageTourButton';
import { Select } from '../../../shared/ui/Select';
import {
  ENVIRONMENT_HINT,
  ENVIRONMENT_OPTIONS,
  SYSTEM_OPTIONS,
  TIME_RANGE_OPTIONS,
  type DashboardFilterState,
} from '../model/dashboardFilters';

interface DashboardToolbarProps {
  onRefresh: () => void;
  /** Which modules the organisation has; the search wording follows them. */
  modules?: { cloudCost: boolean; sapMonitoring: boolean };
  /**
   * The dashboard's time range, environment and system filters. Left out when there is nothing to filter (a new
   * organisation with nothing connected), which hides the selects.
   */
  filters?: DashboardFilterState;
}

/** Opens the command palette the same way the keyboard shortcut does (the app shell listens for Ctrl+K). */
function openCommandPalette() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true }));
}

/**
 * The dashboard's context bar: a search that opens the real command palette (pages, accounts, systems and
 * actions, also Ctrl+K), the Time range / Environment / System filters, and Refresh, which re-runs the actual
 * queries. The filters live in the page (`useDashboardFilters`) and each one narrows real data there; this bar only
 * shows them. When any is off its default it says so, with a Reset link. The System select is offered only when
 * the organisation has both modules.
 */
export function DashboardToolbar({ onRefresh, modules = { cloudCost: true, sapMonitoring: true }, filters }: DashboardToolbarProps) {
  const both = modules.cloudCost && modules.sapMonitoring;
  const searchLabel = both ? 'Search systems, resources, alerts' : modules.cloudCost ? 'Search accounts, resources, alerts' : 'Search systems, jobs, alerts';
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    onRefresh();
    window.setTimeout(() => setRefreshing(false), 500);
  };

  const values = filters?.filters;
  // The environment filter splits SAP systems only; say so when it is on and there is something it cannot split.
  const environmentHint = values && values.environment !== 'all' && modules.cloudCost && values.system !== 'sap';

  return (
    <div className="mv-dashboard-toolbar">
      <button type="button" className="mv-search mv-search-launcher" onClick={openCommandPalette} aria-haspopup="dialog" aria-keyshortcuts="Control+K">
        <SearchIcon size={16} aria-hidden />
        <span className="mv-search-launcher-text">{searchLabel}…</span>
        <span className="mv-search-launcher-keys" aria-hidden><kbd className="mv-kbd">Ctrl</kbd><kbd className="mv-kbd">K</kbd></span>
      </button>
      <div className="mv-dashboard-filters">
        {filters && values && (
          <div className="mv-dashboard-filter-selects" role="group" aria-label="Dashboard filters">
            <Select
              label="Time range"
              hideLabel
              className={values.timeRange !== 'all' ? 'is-filtered' : undefined}
              value={values.timeRange}
              onChange={filters.setTimeRange}
              options={TIME_RANGE_OPTIONS}
            />
            {modules.sapMonitoring && (
              <Select
                label="Environment"
                hideLabel
                className={values.environment !== 'all' ? 'is-filtered' : undefined}
                value={values.environment}
                onChange={filters.setEnvironment}
                options={ENVIRONMENT_OPTIONS}
              />
            )}
            {filters.showSystem && (
              <Select
                label="System"
                hideLabel
                className={values.system !== 'all' ? 'is-filtered' : undefined}
                value={values.system}
                onChange={filters.setSystem}
                options={SYSTEM_OPTIONS}
              />
            )}
          </div>
        )}
        <button type="button" className="mv-primary-button" onClick={handleRefresh} disabled={refreshing}>
          <RefreshIcon size={16} style={{ marginRight: '0.375rem' }} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
        <PageTourButton />
      </div>
      {filters?.active && (
        <p className="mv-dashboard-filter-state" role="status">
          <span className="mv-dashboard-filter-badge">{filters.activeLabels.length === 1 ? '1 filter on' : `${filters.activeLabels.length} filters on`}</span>
          <span className="mv-dashboard-filter-summary">{filters.activeLabels.join(' · ')}</span>
          {environmentHint && <span className="mv-dashboard-filter-hint">Environment: {ENVIRONMENT_HINT}</span>}
          <button type="button" className="mv-dashboard-filter-reset" onClick={filters.reset}>Reset filters</button>
        </p>
      )}
    </div>
  );
}
