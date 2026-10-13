import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { IdocRecord } from '../../../data-access';
import { oneOf, useRememberedState } from '../../../shared/lib/useRememberedState';
import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import { BarList } from '../../../shared/ui/BarList';
import { Select } from '../../../shared/ui/Select';
import { useMaveraTheme } from '../../../shared/theme/ThemeProvider';
import { chartColors } from '../../../shared/theme/tokens';
import { FilterIcon, SwapIcon } from '../../../shared/ui/icons';
import { IdocScope } from '../components/IdocScope';
import { ageMinutes, dailySeries, groupStats, idocKpis, lifecycleOf, portVolumes } from '../model/idocDerivations';
import { useIdocState } from '../model/idocStore';

const DURATION_OPTIONS = ['All days', 'More than 5 days', 'More than 10 days', 'More than 15 days', 'More than 20 days', 'More than 25 days', 'More than 30 days'];

function KpiCard({ label, tone, count, breakdown, to }: { label: string; tone: string; count: number; breakdown: string; to?: string }) {
  return (
    <article className="mv-kpi">
      <span className="mv-kpi-label" style={{ color: `var(--mv-${tone})` }}>{label}</span>
      <strong className="mv-kpi-value">{count}</strong>
      <span className="mv-muted">{breakdown}</span>
      {to && <Link className="mv-kpi-link" to={to}>View</Link>}
    </article>
  );
}

interface OverviewFilters { startDate: string; endDate: string; idocNumber: string; errorCode: string; duration: string }

function applyOverviewFilters(records: IdocRecord[], f: OverviewFilters): IdocRecord[] {
  const minAgeDays = Number(f.duration.match(/\d+/)?.[0] ?? 0);
  const number = f.idocNumber.trim().replace(/^0+/, '');
  const code = f.errorCode.trim().toLowerCase();
  return records.filter((r) => {
    const day = r.createdAt.slice(0, 10);
    if (f.startDate && day < f.startDate) return false;
    if (f.endDate && day > f.endDate) return false;
    if (number && !r.docnum.replace(/^0+/, '').includes(number)) return false;
    if (code && !(r.statusCode.toLowerCase() === code || r.statusText.toLowerCase().includes(code))) return false;
    if (minAgeDays && ageMinutes(r) < minAgeDays * 1440) return false;
    return true;
  });
}

/**
 * IDOC-01 — processing volume, failures and backlog. Every number and chart is derived from the
 * same IDoc records the detail pages use, after the advanced filters.
 */
export function IdocOverviewPage() {
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  const { records } = useIdocState();
  const [startDate, setStartDate] = useRememberedState('idoc', 'start-date', '');
  const [endDate, setEndDate] = useRememberedState('idoc', 'end-date', '');
  const [idocNumber, setIdocNumber] = useRememberedState('idoc', 'idoc-number', '');
  const [errorCode, setErrorCode] = useRememberedState('idoc', 'error-code', '');
  const [duration, setDuration] = useRememberedState('idoc', 'duration', DURATION_OPTIONS[0], oneOf(DURATION_OPTIONS));
  const [portView, setPortView] = useRememberedState<'All' | 'Sender' | 'Receiver'>('idoc', 'port-view', 'All', oneOf(['All', 'Sender', 'Receiver']));

  const reset = () => { setStartDate(''); setEndDate(''); setIdocNumber(''); setErrorCode(''); setDuration(DURATION_OPTIONS[0]); };
  const filtersActive = Boolean(startDate || endDate || idocNumber || errorCode) || duration !== DURATION_OPTIONS[0];

  const scoped = useMemo(() => applyOverviewFilters(records, { startDate, endDate, idocNumber, errorCode, duration }), [records, startDate, endDate, idocNumber, errorCode, duration]);
  const kpis = idocKpis(scoped);
  const byDirection = (fn: (r: IdocRecord) => boolean) => ({ inbound: scoped.filter((r) => fn(r) && r.direction === 'Inbound').length, outbound: scoped.filter((r) => fn(r) && r.direction === 'Outbound').length });
  const success = byDirection((r) => lifecycleOf(r) === 'Completed');
  const failure = byDirection((r) => lifecycleOf(r) === 'Failed');
  const retried = scoped.filter((r) => r.retries.length > 0);
  const retryPending = retried.filter((r) => r.retries.some((x) => x.result === 'Pending')).length;

  const daily = useMemo(() => dailySeries(scoped), [scoped]);
  const peakFailure = daily.reduce((best, d) => (d.failed > (best?.failed ?? 0) ? d : best), null as (typeof daily)[number] | null);
  const peakSuccess = daily.reduce((best, d) => (d.completed > (best?.completed ?? 0) ? d : best), null as (typeof daily)[number] | null);
  const ports = portVolumes(scoped);
  const portData = ports.map((p) => ({ port: p.port, sender: portView === 'Receiver' ? 0 : p.sender, receiver: portView === 'Sender' ? 0 : p.receiver }));
  const messageTypes = groupStats(scoped, (r) => r.messageType).sort((a, b) => b.count - a.count).map((g) => ({ type: g.key, count: g.count }));
  const partners = groupStats(scoped, (r) => r.partner).sort((a, b) => b.count - a.count).slice(0, 6);

  return (
    <div>
      <AppBreadcrumb items={[{ label: 'IDoc Monitoring', path: '/idocs/overview' }, { label: 'IDoc Overview' }]} />
      <div className="mv-page-heading">
        <div>
          <h1 className="mv-title">IDoc Overview</h1>
          <p className="mv-subtitle">Understand processing volume, failures and backlog.</p>
        </div>
        <IdocScope />
      </div>

      <section className="mv-panel" style={{ marginBottom: 20 }}>
        <div className="mv-panel-header"><h2 className="mv-panel-title"><FilterIcon size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Advanced filters</h2>
          {filtersActive && <button className="mv-secondary-button" onClick={reset}>Reset</button>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
          <label className="mv-field">Start Date<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
          <label className="mv-field">End Date<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
          <label className="mv-field">IDOC Number<input value={idocNumber} onChange={(e) => setIdocNumber(e.target.value)} placeholder="Search IDOC" /></label>
          <label className="mv-field">Error Code<input value={errorCode} onChange={(e) => setErrorCode(e.target.value)} placeholder="e.g. 51 or text" /></label>
          <Select label="Process Duration" value={duration} onChange={setDuration} options={DURATION_OPTIONS.map((d) => ({ value: d, label: d }))} />
        </div>
        {filtersActive && <p className="mv-muted" style={{ marginTop: 10 }}>Showing {scoped.length} of {records.length} IDocs.</p>}
      </section>

      <div className="mv-kpi-row-4" style={{ marginBottom: 20 }}>
        <KpiCard label="Total records" tone="text" count={kpis.total} breakdown={`${kpis.inbound} Inbound · ${kpis.outbound} Outbound`} to="/idocs/traffic" />
        <KpiCard label="Success" tone="success" count={kpis.completed} breakdown={`${success.inbound} Inbound · ${success.outbound} Outbound`} />
        <KpiCard label="Failure" tone="danger" count={kpis.failed} breakdown={`${failure.inbound} Inbound · ${failure.outbound} Outbound`} to="/idocs/failed" />
        <article className="mv-kpi">
          <span className="mv-kpi-label" style={{ color: 'var(--mv-primary)' }}>Reprocessed</span>
          <strong className="mv-kpi-value">{retried.length}</strong>
          <span className="mv-muted">{retryPending} retry pending · {kpis.open} still open</span>
          <Link className="mv-kpi-link" to="/idocs/status">View</Link>
        </article>
      </div>

      <section className="mv-panel" style={{ marginBottom: 20 }}>
        <div className="mv-panel-header">
          <div><h2 className="mv-panel-title">Success & Failure Trend Analysis</h2><p className="mv-muted" style={{ margin: 0, fontSize: 12 }}>IDocs that finished successfully or failed, by day created</p></div>
          <Link className="mv-quiet-button" to="/idocs/analytics">Open analytics</Link>
        </div>
        <div role="img" aria-label="Success and failure trend over time" style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={daily}>
              <CartesianGrid stroke={colors.grid} vertical={false} />
              <XAxis dataKey="date" stroke={colors.axis} tick={{ fontSize: 12 }} interval="preserveStartEnd" />
              <YAxis stroke={colors.axis} tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, borderColor: colors.grid }} />
              <Line type="monotone" dataKey="failed" name="Failures" stroke="var(--mv-danger)" strokeWidth={2} isAnimationActive={false} />
              <Line type="monotone" dataKey="completed" name="Successes" stroke={colors.primary} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mv-pair" style={{ marginTop: 14, marginBottom: 0 }}>
          <div className="mv-peak mv-peak--danger">
            <strong>Peak Failure Period</strong>
            <p>{peakFailure ? <>{peakFailure.date}: <strong>{peakFailure.failed} failures</strong></> : 'No failures in this period.'}</p>
          </div>
          <div className="mv-peak mv-peak--success">
            <strong>Peak Success Period</strong>
            <p>{peakSuccess ? <>{peakSuccess.date}: <strong>{peakSuccess.completed} successes</strong></> : 'No successful IDocs in this period.'}</p>
          </div>
        </div>
      </section>

      <div className="mv-pair">
        <section className="mv-panel">
          <div className="mv-panel-header">
            <div><h2 className="mv-panel-title"><SwapIcon size={16} style={{ verticalAlign: -3, marginRight: 6 }} />Direction (Inbound and Outbound)</h2><p className="mv-muted" style={{ margin: 0, fontSize: 12 }}>IDocs created per day, by direction</p></div>
            <Link className="mv-quiet-button" to="/idocs/traffic">View IDocs</Link>
          </div>
          <div role="img" aria-label="Inbound and outbound IDoc volume over time" style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={daily}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis dataKey="date" stroke={colors.axis} tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                <YAxis stroke={colors.axis} tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: colors.grid }} />
                <Line type="monotone" dataKey="inbound" name="Inbound" stroke={colors.primary} strokeWidth={2} isAnimationActive={false} />
                <Line type="monotone" dataKey="outbound" name="Outbound" stroke={colors.tertiary} strokeWidth={2} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="mv-panel">
          <div className="mv-panel-header">
            <div><h2 className="mv-panel-title">Ports</h2><p className="mv-muted" style={{ margin: 0, fontSize: 12 }}>IDoc traffic by sender and receiver port</p></div>
            <div className="mv-segmented" role="group" aria-label="Port side">
              {(['All', 'Sender', 'Receiver'] as const).map((v) => (
                <button key={v} aria-pressed={portView === v} className={`mv-segmented-btn${portView === v ? ' is-active' : ''}`} onClick={() => setPortView(v)}>{v}</button>
              ))}
            </div>
          </div>
          <div role="img" aria-label="IDoc traffic by sender and receiver port" style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={portData}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis dataKey="port" stroke={colors.axis} tick={{ fontSize: 12 }} />
                <YAxis stroke={colors.axis} tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: colors.grid }} />
                <Bar dataKey="sender" name="Sender" fill={colors.primary} radius={4} />
                <Bar dataKey="receiver" name="Receiver" fill={colors.tertiary} radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="mv-columns-16-8">
        <section className="mv-panel">
          <div className="mv-panel-header"><div><h2 className="mv-panel-title">Message Types</h2><p className="mv-muted" style={{ margin: 0, fontSize: 12 }}>IDoc volume by message type</p></div></div>
          <div role="img" aria-label="IDoc volume by message type" style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={messageTypes} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid stroke={colors.grid} horizontal={false} />
                <XAxis type="number" stroke={colors.axis} tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis type="category" dataKey="type" stroke={colors.axis} tick={{ fontSize: 12 }} width={70} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: colors.grid }} />
                <Bar dataKey="count" name="IDocs" fill={colors.primary} radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="mv-panel">
          <div className="mv-panel-header">
            <div><h2 className="mv-panel-title">Top Partner Performance</h2><p className="mv-muted" style={{ margin: 0, fontSize: 12 }}>Most active partners by IDoc volume</p></div>
            <Link className="mv-quiet-button" to="/idocs/partners">All partners</Link>
          </div>
          <BarList label="IDoc volume by partner" items={partners.map((p) => ({ key: p.key, label: p.key, value: p.count, meta: p.failed ? `${p.failed} failed` : 'No failures' }))} />
        </section>
      </div>
    </div>
  );
}
