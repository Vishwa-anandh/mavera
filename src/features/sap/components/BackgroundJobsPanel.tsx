import { useMemo, useState } from 'react';
import type { SapJob } from '../../../data-access';
import { ClockIcon, SearchIcon } from '../../../shared/ui/icons';
import {
  JOBS_PAGE_SIZE, JOB_FILTERS, JOB_STATUS_LABEL, JOB_STATUS_TONE, filterJobs, jobStatusCounts, sortJobsNewestFirst, type JobFilter,
} from '../model/sapPerformance';
import { TcodeBadge } from './TcodeBadge';

interface BackgroundJobsPanelProps {
  jobs: SapJob[];
  /** Which status chip starts selected (Performance links here with `?status=Running`). */
  initialFilter?: JobFilter;
  onOpenJob: (job: SapJob) => void;
}

/**
 * Background Jobs (SM37): status chips with counts, a job search and "Show more" paging. The chips count
 * the whole job list, like the source; search and chip together narrow the table. This is the one place
 * the job list is filtered, SAP Performance links here rather than keeping its own copy.
 */
export function BackgroundJobsPanel({ jobs, initialFilter = 'All', onOpenJob }: BackgroundJobsPanelProps) {
  const [filter, setFilter] = useState<JobFilter>(initialFilter);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(JOBS_PAGE_SIZE);

  const counts = useMemo(() => jobStatusCounts(jobs), [jobs]);
  const matches = useMemo(() => sortJobsNewestFirst(filterJobs(jobs, filter, query)), [jobs, filter, query]);
  const shown = matches.slice(0, limit);
  const remaining = matches.length - shown.length;
  const narrowed = filter !== 'All' || query.trim() !== '';

  const choose = (next: JobFilter) => { setFilter(next); setLimit(JOBS_PAGE_SIZE); };

  return (
    <section className="mv-panel" id="jobs" aria-labelledby="sap-jobs-title">
      <div className="mv-panel-header">
        <h2 id="sap-jobs-title" className="mv-panel-title"><ClockIcon size={16} style={{ verticalAlign: -3, marginRight: '0.375rem' }} />Background Jobs <TcodeBadge code="SM37" /></h2>
        <span className="mv-muted">{jobs.length} jobs</span>
      </div>

      <div className="mv-filter-bar" role="search" aria-label="Filter background jobs">
        <label className="mv-filter-search">
          <SearchIcon size={16} aria-hidden />
          <input type="search" aria-label="Search jobs" placeholder="Search jobs..." value={query} onChange={(e) => { setQuery(e.target.value); setLimit(JOBS_PAGE_SIZE); }} />
        </label>
      </div>
      <div className="mv-job-chips" role="group" aria-label="Filter jobs by status">
        {JOB_FILTERS.map((name) => (
          <button key={name} type="button" className={`mv-chip mv-job-chip${filter === name ? ' is-active' : ''}`} aria-pressed={filter === name} onClick={() => choose(name)}>
            {name}<span className="mv-job-chip-count">{counts[name]}</span>
          </button>
        ))}
      </div>

      <p className="mv-sr-only" role="status" aria-live="polite">{matches.length === 0 ? 'No jobs match.' : `Showing ${shown.length} of ${matches.length} jobs.`}</p>

      {matches.length === 0 ? (
        <div className="mv-empty-inline">
          <p><strong>No jobs match</strong></p>
          <p className="mv-muted">{narrowed ? 'Try another status or clear the search.' : 'There are no background jobs for this system.'}</p>
          {narrowed && <button type="button" className="mv-quiet-button" onClick={() => { setFilter('All'); setQuery(''); }}>Clear filters</button>}
        </div>
      ) : (
        <div className="mv-table-wrap">
          <table className="mv-table">
            <thead><tr><th>Job Name</th><th>Status</th><th>Started</th><th>Finished</th><th className="mv-num">Duration</th><th>User</th><th>Client</th></tr></thead>
            <tbody>
              {shown.map((job) => (
                <tr key={`${job.name}-${job.startedAt}`}>
                  <td><button type="button" className="mv-link-button" onClick={() => onOpenJob(job)}>{job.name}</button></td>
                  <td><span className={`mv-status mv-status--${JOB_STATUS_TONE[job.status]}`}>{JOB_STATUS_LABEL[job.status]}</span></td>
                  <td className="mv-muted mv-date">{job.startedAt}</td>
                  <td className="mv-muted mv-date">{job.finishedAt ?? '—'}</td>
                  <td className="mv-num">{job.durationSec !== null ? `${job.durationSec}s` : '—'}</td>
                  <td>{job.user}</td>
                  <td>{job.client}</td>
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
            <button type="button" className="mv-quiet-button" onClick={() => setLimit((current) => current + JOBS_PAGE_SIZE)}>
              Show more ({remaining} remaining)
            </button>
          )}
        </div>
      )}
    </section>
  );
}
