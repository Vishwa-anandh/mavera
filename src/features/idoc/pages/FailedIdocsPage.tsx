import { useMemo, useState } from 'react';
import type { IdocRecord } from '../../../data-access';
import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import { BarList } from '../../../shared/ui/BarList';
import { cssVars } from '../../../shared/lib/cssVars';
import { fireToast } from '../../../shared/lib/toastEvents';
import { useRememberedState } from '../../../shared/lib/useRememberedState';
import { IdocDetailDrawer } from '../components/IdocDetailDrawer';
import { IdocFilterBar } from '../components/IdocFilters';
import { IdocRecordTable } from '../components/IdocRecordTable';
import { IdocScope } from '../components/IdocScope';
import { ReprocessDialog } from '../components/ReprocessDialog';
import { applyIdocFilters, useIdocFilters } from '../model/idocFilters';
import { ageMinutes, formatAge, hasPendingRetry, lifecycleOf } from '../model/idocDerivations';
import { exportIdocs } from '../model/idocExport';
import { statusInfo } from '../model/idocStatus';
import { reprocessIdocs, useIdocState, type ReprocessOutcome } from '../model/idocStore';

const ALL_CATEGORIES = 'All';
const canRetry = (record: IdocRecord) => statusInfo(record.statusCode).reprocessable && !hasPendingRetry(record);

/**
 * IDOC-03 — failed IDocs, oldest unresolved first, with diagnosis and supported recovery.
 * Reprocessing asks for confirmation naming each record and its status; a submitted retry is
 * shown as Pending, never as fixed.
 */
export function FailedIdocsPage() {
  const { records } = useIdocState();
  const failed = useMemo(() => records.filter((r) => lifecycleOf(r) === 'Failed'), [records]);
  const filters = useIdocFilters('failed');
  const [category, setCategory] = useRememberedState('idoc', 'failed-category', ALL_CATEGORIES);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState<IdocRecord[] | null>(null);
  const [lastOutcome, setLastOutcome] = useState<ReprocessOutcome | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of failed) counts.set(r.errorCategory ?? 'Uncategorised', (counts.get(r.errorCategory ?? 'Uncategorised') ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [failed]);

  const visible = useMemo(
    () => applyIdocFilters(failed, filters.values)
      .filter((r) => category === ALL_CATEGORIES || (r.errorCategory ?? 'Uncategorised') === category)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [failed, filters.values, category],
  );

  const partners = new Set(failed.map((r) => r.partner)).size;
  const oldest = failed.length ? Math.max(...failed.map((r) => ageMinutes(r))) : null;
  const pending = failed.filter(hasPendingRetry).length;

  const toggle = (docnum: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(docnum)) next.delete(docnum); else next.add(docnum);
    return next;
  });
  const toggleAll = (docnums: string[]) => setSelected((current) => (docnums.every((d) => current.has(d)) ? new Set() : new Set(docnums)));

  const confirmReprocess = (targets: IdocRecord[]) => {
    const outcome = reprocessIdocs(targets.map((r) => r.docnum));
    setConfirming(null);
    setSelected(new Set());
    setLastOutcome(outcome);
    fireToast({
      type: outcome.skipped.length ? 'warning' : 'success',
      message: outcome.submitted.length
        ? `Retry submitted for ${outcome.submitted.length} IDoc${outcome.submitted.length === 1 ? '' : 's'} — pending until SAP reports a new status.${outcome.skipped.length ? ` ${outcome.skipped.length} skipped.` : ''}`
        : 'No retries were submitted.',
    });
  };

  const selectedRecords = visible.filter((r) => selected.has(r.docnum));
  const openRecord = open ? records.find((r) => r.docnum === open) ?? null : null;

  return (
    <div>
      <AppBreadcrumb items={[{ label: 'IDoc Monitoring', path: '/idocs/overview' }, { label: 'Failed IDocs' }]} />
      <div className="mv-page-heading">
        <div>
          <h1 className="mv-title">Failed IDocs</h1>
          <p className="mv-subtitle">Find out why IDocs failed and retry the ones SAP allows. Oldest failures first.</p>
        </div>
        <IdocScope />
      </div>

      <div className="mv-kpi-row-4">
        <article className="mv-kpi"><span className="mv-kpi-label">Failed IDocs</span><strong className="mv-kpi-value">{failed.length}</strong><span className="mv-muted">of {records.length} in this period</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Partners affected</span><strong className="mv-kpi-value">{partners}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Oldest unresolved</span><strong className="mv-kpi-value">{formatAge(oldest)}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Retries pending</span><strong className="mv-kpi-value">{pending}</strong><span className="mv-muted">waiting for SAP</span></article>
      </div>

      {lastOutcome && lastOutcome.skipped.length > 0 && (
        <div className="mv-notice" role="status">
          <strong>{lastOutcome.submitted.length} submitted, {lastOutcome.skipped.length} not retried:</strong>
          <ul className="mv-plain-list">
            {lastOutcome.skipped.map((s) => <li key={s.docnum}><span className="mv-mono">{s.docnum}</span> — {s.reason}</li>)}
          </ul>
        </div>
      )}

      <div className="mv-columns-16-8" style={cssVars({ '--mv-cols': 'minmax(0, 3fr) minmax(260px, 1fr)' })}>
        <section className="mv-panel" aria-label="Failed IDoc worklist">
          <div className="mv-panel-header">
            <div>
              <h2 className="mv-panel-title">Worklist</h2>
              <p className="mv-muted">{visible.length} shown{category !== ALL_CATEGORIES ? ` · ${category}` : ''}</p>
            </div>
            <div className="mv-panel-actions">
              <button type="button" className="mv-secondary-button" onClick={() => exportIdocs('failed-idocs.csv', visible)} disabled={visible.length === 0}>Export CSV</button>
              <button type="button" className="mv-primary-button" disabled={selectedRecords.length === 0} onClick={() => setConfirming(selectedRecords)}>
                Reprocess{selectedRecords.length ? ` (${selectedRecords.length})` : ''}
              </button>
            </div>
          </div>
          <IdocFilterBar records={failed} filters={filters} />
          {visible.length === 0 ? (
            <div className="mv-empty-inline">
              <p><strong>{failed.length === 0 ? 'No failed IDocs in this period.' : 'No failed IDocs match these filters.'}</strong></p>
              {(filters.active || category !== ALL_CATEGORIES) && <button type="button" className="mv-quiet-button" onClick={() => { filters.clear(); setCategory(ALL_CATEGORIES); }}>Clear filters</button>}
            </div>
          ) : (
            <IdocRecordTable
              records={visible}
              caption="Failed IDocs, oldest first"
              onOpen={(r) => setOpen(r.docnum)}
              timeColumn="age"
              selection={{ selected, onToggle: toggle, onToggleAll: toggleAll, isSelectable: canRetry }}
            />
          )}
        </section>

        <section className="mv-panel" aria-labelledby="error-groups-title">
          <div className="mv-panel-header"><h2 className="mv-panel-title" id="error-groups-title">Error groups</h2></div>
          <BarList
            label="Failed IDocs by error category"
            items={[
              { key: ALL_CATEGORIES, label: 'All categories', value: failed.length, tone: 'danger', selected: category === ALL_CATEGORIES, onSelect: () => setCategory(ALL_CATEGORIES) },
              ...categories.map(([name, count]) => ({ key: name, label: name, value: count, tone: 'danger' as const, selected: category === name, onSelect: () => setCategory(category === name ? ALL_CATEGORIES : name) })),
            ]}
          />
        </section>
      </div>

      {openRecord && <IdocDetailDrawer record={openRecord} onClose={() => setOpen(null)} onReprocess={(r) => { setOpen(null); setConfirming([r]); }} />}
      {confirming && <ReprocessDialog records={confirming} onCancel={() => setConfirming(null)} onConfirm={() => confirmReprocess(confirming)} />}
    </div>
  );
}
