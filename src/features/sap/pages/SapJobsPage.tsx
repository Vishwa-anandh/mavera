import { useMemo, useState } from 'react';
import { SapConnectionGate } from '../components/SapConnectionGate';
import { useSearchParams } from 'react-router-dom';
import { sapRepository, type SapJob } from '../../../data-access';
import { DetailDrawer, DetailList } from '../../../shared/ui/DetailDrawer';
import { CopyButton } from '../../../shared/ui/CopyButton';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { AlertTriangleIcon } from '../../../shared/ui/icons';
import { useHashTab } from '../../../shared/lib/useHashTab';
import { TabBar, tabPanelProps } from '../../../shared/ui/TabBar';
import { BackgroundJobsPanel, type JobsView } from '../components/BackgroundJobsPanel';
import { DestinationSwitcher } from '../components/DestinationSwitcher';
import { TcodeBadge } from '../components/TcodeBadge';
import { JOB_FILTERS, JOB_STATUS_LABEL, JOB_STATUS_TONE, type JobFilter } from '../model/sapPerformance';
import { PageHeader } from '../../../shared/ui/PageHeader';

type JobsTab = 'jobs' | 'dumps';
const TABS: JobsTab[] = ['jobs', 'dumps'];

/**
 * Jobs & Dumps: background jobs (SM37) and ABAP short dumps (ST22), one tab each (`#jobs`, `#dumps`) — the two
 * operational tables an SAP admin checks together. Replaces the separate Jobs and Dumps pages;
 * `/sap/dumps` redirects to `#dumps`. The job list is filtered in the Jobs tab (status chips, search, show more);
 * Performance links in with `?status=` instead of keeping its own copy. The chip, search and "Show more" state is
 * held here so it survives a switch to the dumps tab and back.
 */
function SapJobsPageContent() {
  const [tab, setTab] = useHashTab(TABS);
  const [params] = useSearchParams();
  const requested = params.get('status');
  const initialFilter: JobFilter = JOB_FILTERS.find((f) => f === requested) ?? 'All';
  const [jobsView, setJobsView] = useState<JobsView | null>(null);
  const [seenFilter, setSeenFilter] = useState(initialFilter);
  if (seenFilter !== initialFilter) { setSeenFilter(initialFilter); setJobsView(null); } // a new ?status= link starts a fresh view
  const jobs = useMemo(() => sapRepository.listJobs(), []);
  const dumps = useMemo(() => sapRepository.listDumps(), []);
  const [openJob, setOpenJob] = useState<SapJob | null>(null);
  const [openDumpId, setOpenDumpId] = useState<string | null>(null);
  const openDump = dumps.find((err) => err.id === openDumpId);

  return (
    <div>
      <PageHeader title="Jobs & Dumps" subtitle="Background job runs (SM37) and ABAP runtime errors (ST22) across your connected systems.">
        <DestinationSwitcher />
      </PageHeader>

      <TabBar
        idPrefix="sap-jobs"
        label="Jobs and dumps sections"
        activeId={tab}
        onChange={(id) => setTab(id as JobsTab)}
        items={[{ id: 'jobs', label: 'Background jobs', count: jobs.length }, { id: 'dumps', label: 'Short dumps', count: dumps.length }]}
      />

      {tab === 'jobs' && (
        <div {...tabPanelProps('sap-jobs', 'jobs')}>
          <BackgroundJobsPanel
            key={initialFilter}
            jobs={jobs}
            initialFilter={jobsView?.filter ?? initialFilter}
            initialQuery={jobsView?.query}
            initialLimit={jobsView?.limit}
            onViewChange={setJobsView}
            onOpenJob={setOpenJob}
          />
        </div>
      )}

      {tab === 'dumps' && (
        <div {...tabPanelProps('sap-jobs', 'dumps')}>
          <section className="mv-panel" aria-labelledby="sap-dumps-title">
            <div className="mv-panel-header">
              <h2 id="sap-dumps-title" className="mv-panel-title"><AlertTriangleIcon size={16} style={{ verticalAlign: -3, marginRight: '0.375rem' }} />Short Dumps <TcodeBadge code="ST22" /></h2>
              <span className="mv-muted">{dumps.length} dumps</span>
            </div>
            {dumps.length === 0 ? (
              <EmptyState
                icon={<AlertTriangleIcon size={28} />}
                heading="No runtime errors"
                explanation="ST22 has no short dumps for this system in the selected period. New dumps will appear here as they occur."
              />
            ) : (
              <div className="mv-table-wrap">
                <table className="mv-table mv-table--stack">
                  <thead><tr><th>Program</th><th>Error Type</th><th>Occurred</th><th>User</th></tr></thead>
                  <tbody>
                    {dumps.map((err) => (
                      <tr key={err.id}>
                        <td data-label="Program" className="mv-stack-title"><button type="button" className="mv-link-button" onClick={() => setOpenDumpId(err.id)}>{err.program}</button></td>
                        <td data-label="Error Type">{err.errorType}</td>
                        <td data-label="Occurred" className="mv-date">{err.occurredAt}</td>
                        <td data-label="User">{err.user}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {openJob && (
        <DetailDrawer
          title={openJob.name}
          subtitle={<span className={`mv-status mv-status--${JOB_STATUS_TONE[openJob.status]}`}>{JOB_STATUS_LABEL[openJob.status]}</span>}
          onClose={() => setOpenJob(null)}
          footer={<CopyButton value={openJob.name} label="Copy job name" />}
        >
          <h3 className="mv-detail-heading">Run</h3>
          <DetailList
            items={[
              { label: 'Started', value: openJob.startedAt },
              { label: 'Finished', value: openJob.finishedAt ?? 'Not finished' },
              { label: 'Duration', value: openJob.durationSec !== null ? `${openJob.durationSec}s` : '—' },
              { label: 'User', value: openJob.user },
              { label: 'Client', value: openJob.client },
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


export function SapJobsPage() {
  return (
    <SapConnectionGate title='Jobs & Dumps' subtitle='Background job runs (SM37) and ABAP runtime errors (ST22) across your connected systems.' willShow='background jobs and ABAP dumps'>
      <SapJobsPageContent />
    </SapConnectionGate>
  );
}
