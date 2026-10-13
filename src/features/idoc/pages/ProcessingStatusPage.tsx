import { useMemo, useState } from 'react';
import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import { BarList } from '../../../shared/ui/BarList';
import { StatusTag } from '../../../shared/ui/StatusTag';
import { useRememberedState } from '../../../shared/lib/useRememberedState';
import { IdocDetailDrawer } from '../components/IdocDetailDrawer';
import { IdocRecordTable } from '../components/IdocRecordTable';
import { IdocScope } from '../components/IdocScope';
import { ageMinutes, formatAge, formatDateTime, lifecycleOf } from '../model/idocDerivations';
import { LIFECYCLE_ORDER, LIFECYCLE_TONE, isOpen, statusInfo } from '../model/idocStatus';
import { useIdocState } from '../model/idocStore';

/** Age buckets for open IDocs. Fixed here until product configuration supplies them (IDOC-04). */
const AGE_BUCKETS = [
  { key: 'lt1h', label: 'Under 1 hour', max: 60 },
  { key: '1to4h', label: '1–4 hours', max: 240 },
  { key: '4to24h', label: '4–24 hours', max: 1440 },
  { key: 'gt24h', label: 'Over 24 hours', max: Infinity },
];

/**
 * IDOC-04 — where IDocs are sitting and for how long: counts by lifecycle, a stage table per
 * technical status (longest waiting first) and age buckets for open records. Unmapped codes stay
 * visible with their code.
 */
export function ProcessingStatusPage() {
  const { records } = useIdocState();
  const [stage, setStage] = useRememberedState('idoc', 'status-stage', '');
  const [open, setOpen] = useState<string | null>(null);

  const stages = useMemo(() => {
    const byCode = new Map<string, typeof records>();
    for (const r of records) byCode.set(r.statusCode, [...(byCode.get(r.statusCode) ?? []), r]);
    return [...byCode.entries()]
      .map(([code, items]) => ({
        code,
        info: statusInfo(code),
        count: items.length,
        oldest: Math.max(...items.map((r) => ageMinutes(r))),
        lastUpdate: items.map((r) => r.updatedAt).sort().slice(-1)[0],
        items,
      }))
      .sort((a, b) => Number(isOpen(b.info.lifecycle)) - Number(isOpen(a.info.lifecycle)) || b.oldest - a.oldest);
  }, [records]);

  const openRecords = records.filter((r) => isOpen(lifecycleOf(r)));
  const oldestWaiting = openRecords.length ? Math.max(...openRecords.map((r) => ageMinutes(r))) : null;
  const lifecycleCounts = LIFECYCLE_ORDER.map((lifecycle) => ({ lifecycle, count: records.filter((r) => lifecycleOf(r) === lifecycle).length }));
  const buckets = AGE_BUCKETS.map((bucket, i) => {
    const min = i === 0 ? 0 : AGE_BUCKETS[i - 1].max;
    return { ...bucket, count: openRecords.filter((r) => { const age = ageMinutes(r); return age >= min && age < bucket.max; }).length };
  });
  const selectedStage = stages.find((s) => s.code === stage);
  const openRecord = open ? records.find((r) => r.docnum === open) ?? null : null;

  return (
    <div>
      <AppBreadcrumb items={[{ label: 'IDoc Monitoring', path: '/idocs/overview' }, { label: 'Processing Status' }]} />
      <div className="mv-page-heading">
        <div>
          <h1 className="mv-title">Processing Status</h1>
          <p className="mv-subtitle">Where IDocs are in processing and how long they’ve been waiting.</p>
        </div>
        <IdocScope />
      </div>

      <div className="mv-lifecycle-strip" role="list" aria-label="IDocs by lifecycle">
        {lifecycleCounts.map(({ lifecycle, count }) => (
          <div key={lifecycle} role="listitem" className="mv-lifecycle-cell">
            <StatusTag tone={LIFECYCLE_TONE[lifecycle]}>{lifecycle}</StatusTag>
            <strong>{count}</strong>
          </div>
        ))}
        <div role="listitem" className="mv-lifecycle-cell">
          <span className="mv-muted">Oldest open</span>
          <strong>{formatAge(oldestWaiting)}</strong>
        </div>
      </div>

      <div className="mv-columns-16-8">
        <section className="mv-panel" aria-labelledby="stages-title">
          <div className="mv-panel-header">
            <div>
              <h2 className="mv-panel-title" id="stages-title">Stages</h2>
              <p className="mv-muted">Open stages first, longest waiting at the top. Choose a stage to see its IDocs.</p>
            </div>
          </div>
          <div className="mv-table-wrap">
            <table className="mv-table mv-table--stack">
              <thead><tr><th>Lifecycle</th><th>Status</th><th className="mv-num">IDocs</th><th>Oldest</th><th>Last update</th></tr></thead>
              <tbody>
                {stages.map((s) => (
                  <tr key={s.code} className={stage === s.code ? 'is-selected' : undefined}>
                    <td data-label="Lifecycle"><StatusTag tone={LIFECYCLE_TONE[s.info.lifecycle]}>{s.info.lifecycle === 'Unmapped' ? 'Unmapped status' : s.info.lifecycle}</StatusTag></td>
                    <td data-label="Status" className="mv-stack-title">
                      <button type="button" className="mv-link-button" aria-pressed={stage === s.code} onClick={() => setStage(stage === s.code ? '' : s.code)}>
                        {s.code} — {s.info.description}
                      </button>
                    </td>
                    <td data-label="IDocs" className="mv-num">{s.count}</td>
                    <td data-label="Oldest">{formatAge(s.oldest)}</td>
                    <td data-label="Last update">{formatDateTime(s.lastUpdate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mv-panel" aria-labelledby="age-title">
          <div className="mv-panel-header">
            <div>
              <h2 className="mv-panel-title" id="age-title">Open IDocs by age</h2>
              <p className="mv-muted">{openRecords.length} not yet completed or failed</p>
            </div>
          </div>
          <BarList label="Open IDocs by age" items={buckets.map((b) => ({ key: b.key, label: b.label, value: b.count, tone: b.max > 240 ? 'warning' : 'primary' }))} />
        </section>
      </div>

      {selectedStage && (
        <section className="mv-panel" aria-label={`IDocs in status ${selectedStage.code}`} style={{ marginTop: 16 }}>
          <div className="mv-panel-header">
            <div>
              <h2 className="mv-panel-title">Status {selectedStage.code} — {selectedStage.info.description}</h2>
              <p className="mv-muted">{selectedStage.count} IDoc{selectedStage.count === 1 ? '' : 's'}, longest waiting first</p>
            </div>
            <button type="button" className="mv-quiet-button" onClick={() => setStage('')}>Close list</button>
          </div>
          <IdocRecordTable records={[...selectedStage.items].sort((a, b) => a.createdAt.localeCompare(b.createdAt))} caption={`IDocs in status ${selectedStage.code}`} onOpen={(r) => setOpen(r.docnum)} timeColumn="age" />
        </section>
      )}

      {openRecord && <IdocDetailDrawer record={openRecord} onClose={() => setOpen(null)} />}
    </div>
  );
}
