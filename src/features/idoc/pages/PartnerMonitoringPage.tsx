import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import { StatusTag } from '../../../shared/ui/StatusTag';
import { useRememberedState } from '../../../shared/lib/useRememberedState';
import { IdocDetailDrawer } from '../components/IdocDetailDrawer';
import { IdocRecordTable } from '../components/IdocRecordTable';
import { IdocScope } from '../components/IdocScope';
import { formatAge, formatDateTime, groupStats } from '../model/idocDerivations';
import { useIdocState } from '../model/idocStore';

/** Waiting longer than this counts as delayed — the "Backlog age" alert rule's threshold. */
const DELAY_MINUTES = 60;

/**
 * IDOC-06 — partner/message-type combinations with failures or delay, worst first (failures,
 * then oldest wait). "Delayed" only exists while the backlog-age rule is on; quiet partners are
 * not called an outage, since no expected-frequency rule is active.
 */
export function PartnerMonitoringPage() {
  const { records, rules } = useIdocState();
  const [selectedKey, setSelectedKey] = useRememberedState('idoc', 'partners-selected', '');
  const [open, setOpen] = useState<string | null>(null);
  const delayRuleOn = rules.find((r) => r.id === 'rule-backlog')?.enabled ?? false;

  const combos = useMemo(
    () => groupStats(records, (r) => `${r.partner}|${r.messageType}|${r.direction}`)
      .sort((a, b) => b.failed - a.failed || (b.oldestWaitingMinutes ?? -1) - (a.oldestWaitingMinutes ?? -1)),
    [records],
  );
  const failing = combos.filter((c) => c.failed > 0).length;
  const delayed = combos.filter((c) => (c.oldestWaitingMinutes ?? 0) > DELAY_MINUTES).length;
  const selected = combos.find((c) => c.key === selectedKey);
  const openRecord = open ? records.find((r) => r.docnum === open) ?? null : null;

  return (
    <div>
      <AppBreadcrumb items={[{ label: 'IDoc Monitoring', path: '/idocs/overview' }, { label: 'Partner/Message Monitoring' }]} />
      <div className="mv-page-heading">
        <div>
          <h1 className="mv-title">Partner/Message Monitoring</h1>
          <p className="mv-subtitle">Which partner and message type combinations are failing or held up.</p>
        </div>
        <IdocScope />
      </div>

      <div className="mv-kpi-row-4">
        <article className="mv-kpi"><span className="mv-kpi-label">Active combinations</span><strong className="mv-kpi-value">{combos.length}</strong><span className="mv-muted">partner × message type × direction</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">With failures</span><strong className="mv-kpi-value">{failing}</strong></article>
        <article className="mv-kpi">
          <span className="mv-kpi-label">Delayed</span>
          <strong className="mv-kpi-value">{delayRuleOn ? delayed : '—'}</strong>
          <span className="mv-muted">{delayRuleOn ? `waiting over ${DELAY_MINUTES} min` : <>Turn on the <Link to="/idocs/alerts-reports">backlog rule</Link> to track delay</>}</span>
        </article>
        <article className="mv-kpi"><span className="mv-kpi-label">Partners</span><strong className="mv-kpi-value">{new Set(records.map((r) => r.partner)).size}</strong></article>
      </div>

      <section className="mv-panel" aria-labelledby="combos-title">
        <div className="mv-panel-header">
          <div>
            <h2 className="mv-panel-title" id="combos-title">Combinations</h2>
            <p className="mv-muted">Most failures first, then longest waiting. Choose one to see its IDocs.</p>
          </div>
          <Link className="mv-quiet-button" to="/idocs/alerts-reports">Alert rules</Link>
        </div>
        <div className="mv-table-wrap">
          <table className="mv-table mv-table--stack">
            <thead>
              <tr><th>Partner</th><th>Message type</th><th>Direction</th><th className="mv-num">IDocs</th><th className="mv-num">Failed</th><th className="mv-num">Waiting</th><th>Oldest waiting</th><th>Last activity</th></tr>
            </thead>
            <tbody>
              {combos.map((c) => (
                <tr key={c.key} className={selectedKey === c.key ? 'is-selected' : undefined}>
                  <td data-label="Partner" className="mv-stack-title">
                    <button type="button" className="mv-link-button" aria-pressed={selectedKey === c.key} onClick={() => setSelectedKey(selectedKey === c.key ? '' : c.key)}>{c.partner}</button>
                  </td>
                  <td data-label="Message type">{c.messageType}</td>
                  <td data-label="Direction">{c.direction}</td>
                  <td data-label="IDocs" className="mv-num">{c.count}</td>
                  <td data-label="Failed" className="mv-num">{c.failed ? <StatusTag tone="danger">{c.failed}</StatusTag> : 0}</td>
                  <td data-label="Waiting" className="mv-num">{c.waiting}</td>
                  <td data-label="Oldest waiting">{c.oldestWaitingMinutes === null ? '—' : <>{formatAge(c.oldestWaitingMinutes)}{delayRuleOn && c.oldestWaitingMinutes > DELAY_MINUTES && <> <StatusTag tone="warning">Delayed</StatusTag></>}</>}</td>
                  <td data-label="Last activity">{formatDateTime(c.lastActivity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <section className="mv-panel" aria-label={`IDocs for ${selected.partner} ${selected.messageType}`} style={{ marginTop: 16 }}>
          <div className="mv-panel-header">
            <div>
              <h2 className="mv-panel-title">{selected.partner} · {selected.messageType} · {selected.direction}</h2>
              <p className="mv-muted">{selected.count} IDocs, newest first</p>
            </div>
            <button type="button" className="mv-quiet-button" onClick={() => setSelectedKey('')}>Close list</button>
          </div>
          <IdocRecordTable records={[...selected.records].sort((a, b) => b.createdAt.localeCompare(a.createdAt))} caption={`IDocs for ${selected.partner} ${selected.messageType}`} onOpen={(r) => setOpen(r.docnum)} showDirection={false} />
        </section>
      )}

      {openRecord && <IdocDetailDrawer record={openRecord} onClose={() => setOpen(null)} />}
    </div>
  );
}
