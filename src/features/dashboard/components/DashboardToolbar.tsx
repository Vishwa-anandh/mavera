import { useState } from 'react';
import { RefreshIcon, SearchIcon } from '../../../shared/ui/icons';

interface DashboardToolbarProps {
  onRefresh: () => void;
  /** Which modules the organisation has; the search wording follows them. */
  modules?: { cloudCost: boolean; sapMonitoring: boolean };
}

/** Opens the command palette the same way the keyboard shortcut does (the app shell listens for Ctrl+K). */
function openCommandPalette() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true }));
}

/**
 * The dashboard's context bar: a search that opens the real command palette (pages, accounts, systems and
 * actions, also Ctrl+K) and Refresh, which re-runs the actual queries. The time range, environment and system
 * filters that used to sit here changed nothing (each module has one fixed dataset), so they are gone rather
 * than left looking interactive.
 */
export function DashboardToolbar({ onRefresh, modules = { cloudCost: true, sapMonitoring: true } }: DashboardToolbarProps) {
  const both = modules.cloudCost && modules.sapMonitoring;
  const searchLabel = both ? 'Search systems, resources, alerts' : modules.cloudCost ? 'Search accounts, resources, alerts' : 'Search systems, jobs, alerts';
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    onRefresh();
    window.setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <div className="mv-dashboard-toolbar">
      <button type="button" className="mv-search mv-search-launcher" onClick={openCommandPalette} aria-haspopup="dialog" aria-keyshortcuts="Control+K">
        <SearchIcon size={16} aria-hidden />
        <span className="mv-search-launcher-text">{searchLabel}…</span>
        <span className="mv-search-launcher-keys" aria-hidden><kbd className="mv-kbd">Ctrl</kbd><kbd className="mv-kbd">K</kbd></span>
      </button>
      <div className="mv-dashboard-filters">
        <button type="button" className="mv-primary-button" onClick={handleRefresh} disabled={refreshing}>
          <RefreshIcon size={16} style={{ marginRight: '0.375rem' }} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}
