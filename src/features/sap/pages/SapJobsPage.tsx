import { useState } from 'react';
import { SAP_ABAP_RUNTIME_ERRORS, SAP_BACKGROUND_JOBS, type BackgroundJob } from '../../../demo/sap/mockSapPerformance';
import { DetailDrawer, DetailList } from '../../../shared/ui/DetailDrawer';
import { CopyButton } from '../../../shared/ui/CopyButton';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { AlertTriangleIcon, ClockIcon } from '../../../shared/ui/icons';
import { useScrollToHash } from '../../../shared/lib/useScrollToHash';
import { DestinationSwitcher } from '../components/DestinationSwitcher';
import { PageHeader } from '../../../shared/ui/PageHeader';

const STATUS_TONE: Record<BackgroundJob['status'], string> = {
  Scheduled: 'neutral',
  Running: 'info',
  Finished: 'success',
  Cancelled: 'danger',
};

/**
 * Jobs & Dumps: background jobs (SM37) and ABAP short dumps (ST22) side by side — the two
 * operational tables an SAP admin checks together. Replaces the separate Jobs and Dumps pages;
 * `/sap/dumps` redirects to `#dumps`.
 */
export function SapJobsPage() {
  useScrollToHash();
  const [openName, setOpenName] = useState<string | null>(null);
  const [openDumpId, setOpenDumpId] = useState<string | null>(null);
  const openJob = SAP_BACKGROUND_JOBS.find((job) => job.name === openName);
  const openDump = SAP_ABAP_RUNTIME_ERRORS.find((err) => err.id === openDumpId);

  return (
    <div>
      <PageHeader title="Jobs & Dumps" subtitle="Background job runs (SM37) and ABAP runtime errors (ST22) across your connected systems.">
        <DestinationSwitcher />
      </PageHeader>

      <div className="mv-columns-16-8" style={{ '--mv-cols': '5fr 2fr' } as React.CSSProperties}>
        <section className="mv-panel" id="jobs" aria-labelledby="sap-jobs-title">
          <div className="mv-panel-header">
            <h2 id="sap-jobs-title" className="mv-panel-title"><ClockIcon size={16} style={{ verticalAlign: -3, marginRight: 6 }} />Background Jobs <span className="mv-muted" style={{ fontWeight: 400 }}>SM37</span></h2>
            <span className="mv-muted">{SAP_BACKGROUND_JOBS.length} jobs</span>
          </div>
          <div className="mv-table-wrap">
            <table className="mv-table">
              <thead><tr><th>Job Name</th><th>Status</th><th>Started</th><th>Finished</th><th className="mv-num">Duration</th><th>User</th></tr></thead>
              <tbody>
                {SAP_BACKGROUND_JOBS.map((job) => (
                  <tr key={job.name}>
                    <td><button type="button" className="mv-link-button" onClick={() => setOpenName(job.name)}>{job.name}</button></td>
                    <td><span className={`mv-status mv-status--${STATUS_TONE[job.status]}`}>{job.status}</span></td>
                    <td className="mv-muted mv-date">{job.startedAt}</td>
                    <td className="mv-muted mv-date">{job.finishedAt ?? '—'}</td>
                    <td className="mv-num">{job.durationSec !== null ? `${job.durationSec}s` : '—'}</td>
                    <td>{job.user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mv-panel" id="dumps" aria-labelledby="sap-dumps-title">
          <div className="mv-panel-header">
            <h2 id="sap-dumps-title" className="mv-panel-title"><AlertTriangleIcon size={16} style={{ verticalAlign: -3, marginRight: 6 }} />Short Dumps <span className="mv-muted" style={{ fontWeight: 400 }}>ST22</span></h2>
            <span className="mv-muted">{SAP_ABAP_RUNTIME_ERRORS.length} dumps</span>
          </div>
          {SAP_ABAP_RUNTIME_ERRORS.length === 0 ? (
            <EmptyState
              icon={<AlertTriangleIcon size={28} />}
              heading="No runtime errors"
              explanation="ST22 has no short dumps for this system in the selected period. New dumps will appear here as they occur."
            />
          ) : (
            <div className="mv-table-wrap">
              <table className="mv-table">
                <thead><tr><th>Program</th><th>Error Type</th><th>Occurred</th><th>User</th></tr></thead>
                <tbody>
                  {SAP_ABAP_RUNTIME_ERRORS.map((err) => (
                    <tr key={err.id}>
                      <td><button type="button" className="mv-link-button" onClick={() => setOpenDumpId(err.id)}>{err.program}</button></td>
                      <td>{err.errorType}</td>
                      <td className="mv-date">{err.occurredAt}</td>
                      <td>{err.user}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {openJob && (
        <DetailDrawer
          title={openJob.name}
          subtitle={<span className={`mv-status mv-status--${STATUS_TONE[openJob.status]}`}>{openJob.status}</span>}
          onClose={() => setOpenName(null)}
          footer={<CopyButton value={openJob.name} label="Copy job name" />}
        >
          <h3 className="mv-detail-heading">Run</h3>
          <DetailList
            items={[
              { label: 'Started', value: openJob.startedAt },
              { label: 'Finished', value: openJob.finishedAt ?? 'Not finished' },
              { label: 'Duration', value: openJob.durationSec !== null ? `${openJob.durationSec}s` : '—' },
              { label: 'User', value: openJob.user },
            ]}
          />
        </DetailDrawer>
      )}

      {openDump && (
        <DetailDrawer title={openDump.program} subtitle={openDump.errorType} onClose={() => setOpenDumpId(null)}>
          <h3 className="mv-detail-heading">Short dump</h3>
          <DetailList
            items={[
              { label: 'Program', value: openDump.program },
              { label: 'Error type', value: openDump.errorType },
              { label: 'Occurred', value: openDump.occurredAt },
              { label: 'User', value: openDump.user },
            ]}
          />
        </DetailDrawer>
      )}
    </div>
  );
}
