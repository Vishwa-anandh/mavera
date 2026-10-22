import { useMemo, useState } from 'react';
import type { SapJob } from '../../../data-access';
import { ClockIcon } from '../../../shared/ui/icons';
import {
  JOBS_PAGE_SIZE, JOB_FILTERS, JOB_STATUS_LABEL, JOB_STATUS_TONE, filterJobs, jobStatusCounts, sortJobsNewestFirst, type JobFilter,
} from '../model/sapPerformance';
import { TcodeBadge } from './TcodeBadge';
import { SearchField } from '../../../shared/ui/SearchField';
import { FilterBar } from '../../../shared/ui/FilterBar';
import { FilterChips } from '../../../shared/ui/FilterChips';

/** What the viewer has narrowed the list to; the page can hold it so it survives a tab switch. */
export interface JobsView { filter: JobFilter; query: string; limit: number }

interface BackgroundJobsPanelProps {
  jobs: SapJob[];
  /** Which status chip starts selected (Performance links here with `?status=Running`). */
  initialFilter?: JobFilter;
  /** Search text and number of rows shown to start with (used to restore the view after a tab switch). */
  initialQuery?: string;
  initialLimit?: number;
  /** Called whenever the chip, search or "Show more" count changes. */
  onViewChange?: (view: JobsView) => void;
  onOpenJob: (job: SapJob) => void;
}

/**
 * Background Jobs (SM37): status chips with counts, a job search and "Show more" paging. The chips count
 * the whole job list, like the source; search and chip together narrow the table. This is the one place
 * the job list is filtered, SAP Performance links here rather than keeping its own copy.
 */
export function BackgroundJobsPanel({ jobs, initialFilter = 'All', initialQuery = '', initialLimit = JOBS_PAGE_SIZE, onViewChange, onOpenJob }: BackgroundJobsPanelProps) {
  const [view, setView] = useState<JobsView>({ filter: initialFilter, query: initialQuery, limit: initialLimit });
  const { filter, query, limit } = view;
  const update = (patch: Partial<JobsView>) => {
    const next = { ...view, ...patch };
    setView(next);
    onViewChange?.(next);
  };

  const counts = useMemo(() => jobStatusCounts(jobs), [jobs]);
  const matches = useMemo(() => sortJobsNewestFirst(filterJobs(jobs, filter, query)), [jobs, filter, query]);
  const shown = matches.slice(0, limit);
  const remaining = matches.length - shown.length;
  const narrowed = filter !== 'All' || query.trim() !== '';

  const choose = (next: JobFilter) => update({ filter: next, limit: JOBS_PAGE_SIZE });

  return (
    <section className="mv-panel" aria-labelledby="sap-jobs-title">
      <div className="mv-panel-header">
        <h2 id="sap-jobs-title" className="mv-panel-title"><ClockIcon size={16} style={{ verticalAlign: -3, marginRight: '0.375rem' }} />Background Jobs <TcodeBadge code="SM37" /></h2>
        <span className="mv-muted">{jobs.length} jobs</span>
      </div>

      <FilterBar label="Filter background jobs">
        <SearchField label="Search jobs" placeholder="Search jobs..." value={query} onChange={(value) => update({ query: value, limit: JOBS_PAGE_SIZE })} />
        <FilterChips
          label="Filter jobs by status"
          value={filter}
          onChange={choose}
          chips={JOB_FILTERS.map((name) => ({ value: name, label: name, count: counts[name] }))}
        />
      </FilterBar>

      <p className="mv-sr-only" role="status" aria-live="polite">{matches.length === 0 ? 'No jobs match.' : `Showing ${shown.length} of ${matches.length} jobs.`}</p>

      {matches.length === 0 ? (
        <div className="mv-empty-inline">
          <p><strong>No jobs match</strong></p>
          <p className="mv-muted">{narrowed ? 'Try another status or clear the search.' : 'There are no background jobs for this system.'}</p>
          {narrowed && <button type="button" className="mv-quiet-button" onClick={() => update({ filter: 'All', query: '' })}>Clear filters</button>}
        </div>
      ) : (
        <div className="mv-table-wrap">
          <table className="mv-table mv-table--stack">
            <thead><tr><th>Job Name</th><th>Status</th><th>Started</th><th>Finished</th><th className="mv-num">Duration</th><th>User</th><th>Client</th></tr></thead>
            <tbody>
              {shown.map((job) => (
                <tr key={`${job.name}-${job.startedAt}`}>
                  <td data-label="Job Name" className="mv-stack-title"><button type="button" className="mv-link-button" onClick={() => onOpenJob(job)}>{job.name}</button></td>
                  <td data-label="Status"><span className={`mv-status mv-status--${JOB_STATUS_TONE[job.status]}`}>{JOB_STATUS_LABEL[job.status]}</span></td>
                  <td data-label="Started" className="mv-muted mv-date">{job.startedAt}</td>
                  <td data-label="Finished" className="mv-muted mv-date">{job.finishedAt ?? '—'}</td>
                  <td data-label="Duration" className="mv-num">{job.durationSec !== null ? `${job.durationSec}s` : '—'}</td>
                  <td data-label="User">{job.user}</td>
                  <td data-label="Client">{job.client}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {matches.length > 0 && (
        <div className="mv-show-more">
          <span className="mv-muted" aria-hidden="true">Showing {shown.length} of {matches.length}</span>
          {remaining > 0 && (
            <button type="button" className="mv-quiet-button" onClick={() => update({ limit: limit + JOBS_PAGE_SIZE })}>
              Show more ({remaining} remaining)
            </button>
          )}
        </div>
      )}
    </section>
  );
}
