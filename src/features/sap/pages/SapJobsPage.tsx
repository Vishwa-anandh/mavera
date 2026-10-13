import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import { SAP_BACKGROUND_JOBS, type BackgroundJob } from '../../../demo/sap/mockSapPerformance';
import { ClockIcon } from '../../../shared/ui/icons';
import { DestinationSwitcher } from '../components/DestinationSwitcher';

const STATUS_TONE: Record<BackgroundJob['status'], string> = {
  Scheduled: 'neutral',
  Running: 'info',
  Finished: 'success',
  Cancelled: 'danger',
};

export function SapJobsPage() {
  return (
    <div>
      <AppBreadcrumb items={[{ label: 'SAP Monitoring', path: '/sap/systems' }, { label: 'Jobs' }]} />
      <div className="mv-page-heading">
        <div><h1 className="mv-title">Jobs</h1><p className="mv-subtitle">Background job schedule and run history (SM37).</p></div>
        <DestinationSwitcher />
      </div>

      <section className="mv-panel">
        <div className="mv-panel-header"><h2 className="mv-panel-title"><ClockIcon size={16} style={{ verticalAlign: -3, marginRight: 6 }} />Background Jobs <span className="mv-muted" style={{ fontWeight: 400 }}>SM37</span></h2><span className="mv-muted">{SAP_BACKGROUND_JOBS.length} jobs</span></div>
        <div className="mv-table-wrap">
          <table className="mv-table">
            <thead><tr><th>Job Name</th><th>Status</th><th>Started</th><th>Finished</th><th className="mv-num">Duration</th><th>User</th></tr></thead>
            <tbody>
              {SAP_BACKGROUND_JOBS.map((job) => (
                <tr key={job.name}>
                  <td>{job.name}</td>
                  <td><span className={`mv-status mv-status--${STATUS_TONE[job.status]}`}>{job.status}</span></td>
                  <td className="mv-muted">{job.startedAt}</td>
                  <td className="mv-muted">{job.finishedAt ?? '—'}</td>
                  <td className="mv-num">{job.durationSec !== null ? `${job.durationSec}s` : '—'}</td>
                  <td>{job.user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
