import { Link } from 'react-router-dom';
import type { SapJob } from '../../../data-access';
import { JOB_FILTERS, JOB_STATUS_LABEL, JOB_STATUS_TONE, jobStatusCounts, sortJobsNewestFirst } from '../model/sapPerformance';
import { TcodeBadge } from './TcodeBadge';

const RECENT = 5;

/**
 * Background Jobs (SM37) on the Performance page: the status counts and the latest runs. Each count
 * opens Jobs & Dumps with that status already chosen; the filtering, search and paging live there, so
 * there is one job list and one set of filter state.
 */
export function BackgroundJobsSummaryCard({ jobs }: { jobs: SapJob[] }) {
  const counts = jobStatusCounts(jobs);
  const recent = sortJobsNewestFirst(jobs).slice(0, RECENT);

  return (
    <section className="mv-panel" aria-labelledby="perf-jobs-title">
      <div className="mv-panel-header">
        <h2 id="perf-jobs-title" className="mv-panel-title">Background Jobs <TcodeBadge code="SM37" /></h2>
        <Link className="mv-quiet-button" to="/sap/jobs#jobs">Search all jobs</Link>
      </div>
      <nav className="mv-filter-chips" aria-label="Open jobs by status">
        {JOB_FILTERS.map((name) => (
          <Link key={name} className="mv-chip mv-filter-chip" to={name === 'All' ? '/sap/jobs#jobs' : `/sap/jobs?status=${name}#jobs`}>
            {name}<span className="mv-filter-chip-count">{counts[name]}</span>
          </Link>
        ))}
      </nav>
      <ul className="mv-job-recent" aria-label="Latest background jobs">
        {recent.map((job) => (
          <li key={`${job.name}-${job.startedAt}`}>
            <span className="mv-job-recent-name">{job.name}</span>
            <span className="mv-muted mv-job-recent-time">{job.startedAt.slice(11, 19)}</span>
            <span className="mv-muted mv-job-recent-duration">{job.durationSec !== null ? `${job.durationSec}s` : '—'}</span>
            <span className={`mv-status mv-status--${JOB_STATUS_TONE[job.status]}`}>{JOB_STATUS_LABEL[job.status]}</span>
          </li>
        ))}
      </ul>
      {counts.All > RECENT && <p className="mv-muted" style={{ margin: '0.5rem 0 0' }}>Showing the latest {RECENT} of {counts.All}.</p>}
    </section>
  );
}
