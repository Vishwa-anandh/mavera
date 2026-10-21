import { SearchField } from '../../../shared/ui/SearchField';
import { FilterBar } from '../../../shared/ui/FilterBar';
import { useMemo, useState } from 'react';
import { auditRepository } from '../../../data-access';
import { Can } from '../../access';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Select } from '../../../shared/ui/Select';
import { Pagination } from '../../../shared/ui/Pagination';
import { usePagination } from '../../../shared/ui/usePagination';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { TableSkeleton } from '../../../shared/ui/LoadStates';
import { fireToast } from '../../../shared/lib/toastEvents';
import { downloadCsv } from '../../../shared/lib/csv';
import { ClockIcon, RefreshIcon, UploadIcon } from '../../../shared/ui/icons';
import { AuditEventDrawer } from '../components/AuditEventDrawer';
import { useAuditFeed } from '../model/useAuditFeed';
import { recordAuditEvent } from '../model/recordAuditEvent';
import {
  CSV_HEADER,
  NO_FILTERS,
  RESULT_LABELS,
  RESULT_TONES,
  actorCounts,
  auditModules,
  eventsToCsvRows,
  filterEvents,
  formatTime,
  groupByDay,
  hasActiveFilters,
  localDateKey,
  type ActorFilter,
  type AuditFilters,
} from '../model/auditDerivations';

const ACTOR_OPTIONS: Array<{ key: ActorFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'admin', label: 'Admin' },
  { key: 'member', label: 'Member' },
];

const SYNC_DELAY_MS = 700;

/**
 * The audit signal timeline: who did what, to what, in which part of Mavera, and whether it worked.
 * Filter by actor type, module and date, search across every field, open an event for its full
 * record (permission and role changes show before and after), and export what you see.
 * The feed is held in memory in this prototype; "Manual re-sync" simulates pulling new events.
 */
export function AuditTrailPage() {
  const feed = useAuditFeed();
  const [filters, setFilters] = useState<AuditFilters>(NO_FILTERS);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date>(() => new Date());
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => filterEvents(feed, filters), [feed, filters]);
  const modules = useMemo(() => auditModules(feed), [feed]);
  const counts = useMemo(() => actorCounts(filtered), [filtered]);
  const resetKey = `${filters.actor}|${filters.module}|${filters.from}|${filters.to}|${filters.query}`;
  const paging = usePagination(filtered, 25, resetKey);
  const groups = useMemo(() => groupByDay(paging.pageItems), [paging.pageItems]);
  const openEvent = feed.find((event) => event.id === openId);

  const update = (patch: Partial<AuditFilters>) => setFilters((current) => ({ ...current, ...patch }));
  const today = localDateKey(new Date());

  const resync = () => {
    if (syncing) return;
    setSyncing(true);
    window.setTimeout(() => {
      const arrived = auditRepository.resync();
      setLastSynced(new Date());
      setSyncing(false);
      fireToast({
        type: 'success',
        message: arrived > 0 ? `Audit feed re-synced: ${arrived} new event${arrived === 1 ? '' : 's'}.` : 'Audit feed re-synced: already up to date.',
      });
    }, SYNC_DELAY_MS);
  };

  const exportCsv = () => {
    if (filtered.length === 0) return;
    downloadCsv(`mavera-audit-trail-${today}.csv`, CSV_HEADER, eventsToCsvRows(filtered));
    recordAuditEvent({ action: 'Audit trail exported', target: `${filtered.length} event${filtered.length === 1 ? '' : 's'} (CSV)`, module: 'Audit trail', source: 'Web' });
    fireToast({ type: 'success', message: `Exported ${filtered.length} event${filtered.length === 1 ? '' : 's'} to CSV.` });
  };

  return (
    <div>
      <PageHeader title="Audit Trail" subtitle="Audit signal timeline: the identity governance ledger for your organisation." updatedAt={lastSynced}>
        <Can module="audit" action="EXPORT">
          <button type="button" className="mv-secondary-button" disabled={filtered.length === 0} onClick={exportCsv}>
            <UploadIcon size={16} style={{ marginRight: '0.375rem' }} />
            Export CSV
          </button>
        </Can>
        <button type="button" className="mv-secondary-button" disabled={syncing} onClick={resync}>
          <RefreshIcon size={16} style={{ marginRight: '0.375rem' }} />
          {syncing ? 'Re-syncing…' : 'Manual re-sync'}
        </button>
      </PageHeader>

      <FilterBar label="Filter events" className="mv-audit-filters">
        <SearchField label="Search signatures" placeholder="Search signatures..." value={filters.query} onChange={(value) => update({ query: value })} />
        <div className="mv-segmented" role="radiogroup" aria-label="Actor type">
          {ACTOR_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={filters.actor === option.key}
              className={`mv-segmented-btn${filters.actor === option.key ? ' is-active' : ''}`}
              onClick={() => update({ actor: option.key })}
            >
              {option.label}
            </button>
          ))}
        </div>
        <Select
          label="Module"
          hideLabel
          value={filters.module}
          onChange={(module) => update({ module })}
          options={[{ value: 'all', label: 'All modules' }, ...modules.map((module) => ({ value: module, label: module }))]}
        />
        <div className="mv-audit-dates" role="group" aria-label="Date range">
          <label>
            <span className="mv-sr-only">From date</span>
            <input type="date" aria-label="From date" value={filters.from} max={filters.to || today} onChange={(event) => update({ from: event.target.value })} />
          </label>
          <span aria-hidden className="mv-muted">to</span>
          <label>
            <span className="mv-sr-only">To date</span>
            <input type="date" aria-label="To date" value={filters.to} min={filters.from || undefined} max={today} onChange={(event) => update({ to: event.target.value })} />
          </label>
        </div>
        {hasActiveFilters(filters) && (
          <button type="button" className="mv-quiet-button" onClick={() => setFilters(NO_FILTERS)}>Clear filters</button>
        )}
      </FilterBar>

      <p className="mv-muted mv-scope-note" role="status" aria-live="polite">
        {filtered.length} event{filtered.length === 1 ? '' : 's'}
        {filtered.length > 0 && <> · {counts.admin} by admins · {counts.member} by members</>}
        {' '}· Sample data, held in memory for this session
      </p>

      <section className="mv-panel mv-panel--table mv-audit-panel" aria-label="Audit signal timeline">
        {syncing ? (
          <TableSkeleton columns={4} rows={8} label="Re-syncing the audit feed" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ClockIcon size={28} />}
            heading={feed.length === 0 ? 'No events recorded yet' : `No records for “${ACTOR_OPTIONS.find((o) => o.key === filters.actor)?.label ?? 'All'}”`}
            explanation={feed.length === 0 ? 'Events appear here as people sign in, change access and manage systems.' : 'Nothing matches these filters. Widen the date range, try another module or clear the search.'}
            actionLabel={hasActiveFilters(filters) ? 'Clear filters' : undefined}
            onAction={hasActiveFilters(filters) ? () => setFilters(NO_FILTERS) : undefined}
          />
        ) : (
          <div className="mv-audit-timeline">
            {groups.map((group) => (
              <section key={group.key} className="mv-audit-day" aria-labelledby={`audit-day-${group.key}`}>
                <h2 className="mv-audit-day-title" id={`audit-day-${group.key}`}>
                  {group.label}
                  <span className="mv-muted"> · {group.events.length} event{group.events.length === 1 ? '' : 's'}</span>
                </h2>
                <ol className="mv-audit-events">
                  {group.events.map((event) => (
                    <li key={event.id} className={`mv-audit-event mv-audit-event--${event.result}`}>
                      <time className="mv-audit-time" dateTime={event.at}>{formatTime(event.at)}</time>
                      <span className="mv-audit-dot" aria-hidden />
                      <div className="mv-audit-body">
                        <button type="button" className="mv-link-button mv-audit-action" onClick={() => setOpenId(event.id)} aria-label={`View details: ${event.action}, ${event.target}`}>
                          {event.action}
                        </button>
                        <span className="mv-audit-target">{event.target}</span>
                        <span className="mv-muted mv-audit-meta">
                          {event.actorName} · {event.actorRole} · {event.module}
                        </span>
                      </div>
                      <span className={`mv-status mv-status--${RESULT_TONES[event.result]} mv-audit-result`}>{RESULT_LABELS[event.result]}</span>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
        {!syncing && <Pagination {...paging} noun="events" pageSizeOptions={[10, 25, 50]} />}
      </section>

      {openEvent && <AuditEventDrawer event={openEvent} onClose={() => setOpenId(null)} />}
    </div>
  );
}
