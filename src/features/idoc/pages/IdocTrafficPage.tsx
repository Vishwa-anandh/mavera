import { useMemo, useState } from 'react';
import type { IdocRecord } from '../../../data-access';
import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import { oneOf, useRememberedState } from '../../../shared/lib/useRememberedState';
import { IdocDetailDrawer } from '../components/IdocDetailDrawer';
import { IdocFilterBar } from '../components/IdocFilters';
import { IdocRecordTable } from '../components/IdocRecordTable';
import { IdocScope } from '../components/IdocScope';
import { applyIdocFilters, useIdocFilters } from '../model/idocFilters';
import { lifecycleOf } from '../model/idocDerivations';
import { exportIdocs } from '../model/idocExport';
import { useIdocState } from '../model/idocStore';

/**
 * IDOC-02 — records by processing direction. Direction is how an IDoc travels, not whether it
 * worked: each tab shows every status, newest first.
 */
export function IdocTrafficPage() {
  const { records } = useIdocState();
  const [direction, setDirection] = useRememberedState<IdocRecord['direction']>('idoc', 'traffic-tab', 'Inbound', oneOf(['Inbound', 'Outbound']));
  const filters = useIdocFilters('traffic');
  const [open, setOpen] = useState<IdocRecord | null>(null);

  const inDirection = useMemo(() => records.filter((r) => r.direction === direction), [records, direction]);
  const visible = useMemo(() => applyIdocFilters(inDirection, filters.values).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [inDirection, filters.values]);
  const counts = { Inbound: records.filter((r) => r.direction === 'Inbound').length, Outbound: records.filter((r) => r.direction === 'Outbound').length };
  const failed = inDirection.filter((r) => lifecycleOf(r) === 'Failed').length;

  return (
    <div>
      <AppBreadcrumb items={[{ label: 'IDoc Monitoring', path: '/idocs/overview' }, { label: 'Inbound / Outbound' }]} />
      <div className="mv-page-heading">
        <div>
          <h1 className="mv-title">Inbound / Outbound</h1>
          <p className="mv-subtitle">Every IDoc by the way it travels, newest first. Open one to see its control record and status history.</p>
        </div>
        <IdocScope />
      </div>

      <div className="mv-segmented mv-direction-tabs" role="tablist" aria-label="Direction">
        {(['Inbound', 'Outbound'] as const).map((d) => (
          <button key={d} type="button" role="tab" aria-selected={direction === d} className={`mv-segmented-btn${direction === d ? ' is-active' : ''}`} onClick={() => setDirection(d)}>
            {d} <span className="mv-count-chip">{counts[d]}</span>
          </button>
        ))}
      </div>

      <section className="mv-panel" aria-label={`${direction} IDocs`}>
        <div className="mv-panel-header">
          <div>
            <h2 className="mv-panel-title">{direction} IDocs</h2>
            <p className="mv-muted">{inDirection.length} records · {failed} failed · last 14 days</p>
          </div>
          <button type="button" className="mv-secondary-button" onClick={() => exportIdocs(`idocs-${direction.toLowerCase()}.csv`, visible)} disabled={visible.length === 0}>Export CSV</button>
        </div>
        <IdocFilterBar records={inDirection} filters={filters} showDirection={false} />
        {visible.length === 0 ? (
          <div className="mv-empty-inline">
            <p><strong>{inDirection.length === 0 ? `No ${direction.toLowerCase()} IDocs in this period.` : `No ${direction.toLowerCase()} IDocs match these filters.`}</strong></p>
            {filters.active && <button type="button" className="mv-quiet-button" onClick={filters.clear}>Clear filters</button>}
          </div>
        ) : (
          <IdocRecordTable records={visible} caption={`${direction} IDocs`} onOpen={setOpen} showDirection={false} />
        )}
      </section>

      {open && <IdocDetailDrawer record={records.find((r) => r.docnum === open.docnum) ?? open} onClose={() => setOpen(null)} />}
    </div>
  );
}
