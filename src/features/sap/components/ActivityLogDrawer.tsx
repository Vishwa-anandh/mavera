import { useState } from 'react';
import type { TransportActivity } from '../../../data-access';
import { DetailDrawer } from '../../../shared/ui/DetailDrawer';
import { Pagination } from '../../../shared/ui/Pagination';
import { Select } from '../../../shared/ui/Select';
import { StatusTag } from '../../../shared/ui/StatusTag';
import { usePagination } from '../../../shared/ui/usePagination';
import { SearchIcon } from '../../../shared/ui/icons';
import { formatStampWithYear } from '../model/sapFormat';
import { LEVEL_TONE, LOG_LEVELS, LOG_TYPES, filterActivity, sortActivity, type ActivityFilters } from '../model/transports';

/** A run of activity entries: level, what kind of event, when, who and what happened. */
export function ActivityList({ entries, label }: { entries: TransportActivity[]; label: string }) {
  return (
    <ul className="mv-activity-list" aria-label={label}>
      {entries.map((entry) => (
        <li key={entry.id} className="mv-activity-item">
          <div className="mv-activity-meta">
            <StatusTag tone={LEVEL_TONE[entry.level]}>{entry.level}</StatusTag>
            <span className="mv-activity-type">{entry.type}</span>
            <time className="mv-muted" dateTime={entry.at}>{formatStampWithYear(entry.at)}</time>
          </div>
          <p className="mv-activity-message">{entry.message}</p>
          <p className="mv-muted mv-activity-actor">{entry.actor}</p>
        </li>
      ))}
    </ul>
  );
}

/** The whole activity log, newest first, filterable by level and type, searchable and paged. */
export function ActivityLogDrawer({ entries, onClose }: { entries: TransportActivity[]; onClose: () => void }) {
  const [filters, setFilters] = useState<ActivityFilters>({ level: 'All', type: 'All', search: '' });
  const filtered = filterActivity(sortActivity(entries), filters);
  const paging = usePagination(filtered, 10, `${filters.level}|${filters.type}|${filters.search}`);
  const active = filters.level !== 'All' || filters.type !== 'All' || Boolean(filters.search.trim());
  const set = <K extends keyof ActivityFilters>(key: K, value: ActivityFilters[K]) => setFilters((cur) => ({ ...cur, [key]: value }));

  return (
    <DetailDrawer title="Activity log" subtitle={`${entries.length} entries, newest first`} onClose={onClose}>
      <div className="mv-filter-bar mv-filter-bar--drawer" role="search" aria-label="Filter activity log">
        <label className="mv-filter-search">
          <SearchIcon size={16} aria-hidden />
          <input aria-label="Search the activity log" placeholder="Search messages or users…" value={filters.search} onChange={(e) => set('search', e.target.value)} />
        </label>
        <Select label="Level" hideLabel value={filters.level} onChange={(v) => set('level', v)} options={[{ value: 'All', label: 'All levels' }, ...LOG_LEVELS.map((l) => ({ value: l, label: l }))]} />
        <Select label="Type" hideLabel value={filters.type} onChange={(v) => set('type', v)} options={[{ value: 'All', label: 'All types' }, ...LOG_TYPES.map((t) => ({ value: t, label: t }))]} />
        {active && <button type="button" className="mv-quiet-button" onClick={() => setFilters({ level: 'All', type: 'All', search: '' })}>Clear filters</button>}
      </div>
      {entries.length === 0 ? (
        <p className="mv-muted">No activity yet.</p>
      ) : filtered.length === 0 ? (
        <p className="mv-muted">No log entries match these filters.</p>
      ) : (
        <>
          <ActivityList entries={paging.pageItems} label="Activity log entries" />
          <Pagination page={paging.page} pageSize={paging.pageSize} total={paging.total} onPageChange={paging.onPageChange} onPageSizeChange={paging.onPageSizeChange} noun="entries" />
        </>
      )}
    </DetailDrawer>
  );
}
