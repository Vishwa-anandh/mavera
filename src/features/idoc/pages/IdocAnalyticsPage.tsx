import { useMemo } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import { BarList } from '../../../shared/ui/BarList';
import { downloadCsv } from '../../../shared/lib/csv';
import { oneOf, useRememberedState } from '../../../shared/lib/useRememberedState';
import { useMaveraTheme } from '../../../shared/theme/ThemeProvider';
import { chartColors } from '../../../shared/theme/tokens';
import { IdocScope } from '../components/IdocScope';
import { dailySeries, groupStats, idocKpis, type GroupStats } from '../model/idocDerivations';
import { useIdocState } from '../model/idocStore';

type GroupBy = 'partner' | 'messageType' | 'combination';
const GROUP_LABEL: Record<GroupBy, string> = { partner: 'Partner', messageType: 'Message type', combination: 'Partner + message' };
const MIN_DURATION_SAMPLES = 3;

const groupName = (g: GroupStats, by: GroupBy) => (by === 'partner' ? g.partner : by === 'messageType' ? g.messageType : `${g.partner} · ${g.messageType}`) ?? g.key;

/**
 * IDOC-05 — throughput, failure rate and processing duration over the last 14 days, broken down
 * by partner or message type. Failure rate = failed ÷ (failed + completed); open records are not
 * counted either way. Duration is only claimed with enough measured samples.
 */
export function IdocAnalyticsPage() {
  const { records } = useIdocState();
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  const [groupBy, setGroupBy] = useRememberedState<GroupBy>('idoc', 'analytics-group', 'partner', oneOf(['partner', 'messageType', 'combination']));

  const kpis = idocKpis(records);
  const daily = useMemo(() => dailySeries(records), [records]);
  const groups = useMemo(
    () => groupStats(records, (r) => (groupBy === 'partner' ? r.partner : groupBy === 'messageType' ? r.messageType : `${r.partner}|${r.messageType}`)).sort((a, b) => b.count - a.count),
    [records, groupBy],
  );
  const durations = records.map((r) => r.durationSeconds).filter((d): d is number => d !== null).sort((a, b) => a - b);
  const medianDuration = durations.length >= MIN_DURATION_SAMPLES ? durations[Math.floor(durations.length / 2)] : null;
  const failureRate = kpis.completed + kpis.failed > 0 ? Math.round((kpis.failed / (kpis.completed + kpis.failed)) * 1000) / 10 : null;

  const exportGroups = () => downloadCsv(`idoc-analytics-by-${groupBy}.csv`, [GROUP_LABEL[groupBy], 'IDocs', 'Failed', 'Completed', 'Failure rate %', 'Median duration s', 'Duration samples'],
    groups.map((g) => [groupName(g, groupBy), g.count, g.failed, g.completed, g.failureRate ?? '', g.durationSamples >= MIN_DURATION_SAMPLES ? g.medianSeconds ?? '' : '', g.durationSamples]));

  return (
    <div>
      <AppBreadcrumb items={[{ label: 'IDoc Monitoring', path: '/idocs/overview' }, { label: 'IDoc Analytics' }]} />
      <div className="mv-page-heading">
        <div>
          <h1 className="mv-title">IDoc Analytics</h1>
          <p className="mv-subtitle">Throughput, failure rate and processing time, by partner or message type.</p>
        </div>
        <IdocScope />
      </div>

      <div className="mv-kpi-row-4">
        <article className="mv-kpi"><span className="mv-kpi-label">IDocs</span><strong className="mv-kpi-value">{kpis.total}</strong><span className="mv-muted">{kpis.inbound} inbound · {kpis.outbound} outbound</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Failure rate</span><strong className="mv-kpi-value">{failureRate === null ? '—' : `${failureRate}%`}</strong><span className="mv-muted">{kpis.failed} failed of {kpis.failed + kpis.completed} finished</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Still open</span><strong className="mv-kpi-value">{kpis.open}</strong><span className="mv-muted">not counted in the rate</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Median processing time</span><strong className="mv-kpi-value">{medianDuration === null ? '—' : `${medianDuration} s`}</strong><span className="mv-muted">{durations.length < MIN_DURATION_SAMPLES ? `Too few timed IDocs (${durations.length})` : `${durations.length} timed IDocs`}</span></article>
      </div>

      <div className="mv-pair">
        <section className="mv-panel" aria-labelledby="throughput-title">
          <div className="mv-panel-header"><h2 className="mv-panel-title" id="throughput-title">Daily throughput</h2></div>
          <div role="img" aria-label="IDocs created per day, total and failed" style={{ height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={daily}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis dataKey="date" stroke={colors.axis} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis stroke={colors.axis} tick={{ fontSize: 11 }} allowDecimals={false} width={30} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" name="All IDocs" stroke={colors.primary} strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="failed" name="Failed" stroke="var(--mv-danger)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="mv-panel" aria-labelledby="rate-title">
          <div className="mv-panel-header"><h2 className="mv-panel-title" id="rate-title">Daily failure rate</h2><span className="mv-muted">failed ÷ finished, %</span></div>
          <div role="img" aria-label="Failure rate per day" style={{ height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={daily}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis dataKey="date" stroke={colors.axis} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis stroke={colors.axis} tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" width={40} />
                <Tooltip />
                <Line type="monotone" dataKey="failureRate" name="Failure rate" stroke="var(--mv-danger)" strokeWidth={2} connectNulls={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="mv-panel" aria-labelledby="breakdown-title">
        <div className="mv-panel-header">
          <h2 className="mv-panel-title" id="breakdown-title">Breakdown by {GROUP_LABEL[groupBy].toLowerCase()}</h2>
          <div className="mv-panel-actions">
            <div className="mv-segmented" role="group" aria-label="Group by">
              {(Object.keys(GROUP_LABEL) as GroupBy[]).map((key) => (
                <button key={key} type="button" aria-pressed={groupBy === key} className={`mv-segmented-btn${groupBy === key ? ' is-active' : ''}`} onClick={() => setGroupBy(key)}>{GROUP_LABEL[key]}</button>
              ))}
            </div>
            <button type="button" className="mv-secondary-button" onClick={exportGroups}>Export CSV</button>
          </div>
        </div>
        <div className="mv-columns-16-8">
          <div className="mv-table-wrap">
            <table className="mv-table mv-table--stack">
              <thead><tr><th>{GROUP_LABEL[groupBy]}</th><th className="mv-num">IDocs</th><th className="mv-num">Failed</th><th className="mv-num">Failure rate</th><th className="mv-num">Median time</th><th className="mv-num">Timed</th></tr></thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.key}>
                    <td data-label={GROUP_LABEL[groupBy]} className="mv-stack-title"><strong>{groupName(g, groupBy)}</strong></td>
                    <td data-label="IDocs" className="mv-num">{g.count}</td>
                    <td data-label="Failed" className="mv-num">{g.failed}</td>
                    <td data-label="Failure rate" className="mv-num">{g.failureRate === null ? '—' : `${g.failureRate}%`}</td>
                    <td data-label="Median time" className="mv-num">{g.durationSamples >= MIN_DURATION_SAMPLES && g.medianSeconds !== null ? `${g.medianSeconds} s` : '—'}</td>
                    <td data-label="Timed" className="mv-num">{g.durationSamples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <BarList label={`IDoc volume by ${GROUP_LABEL[groupBy].toLowerCase()}`} items={groups.slice(0, 8).map((g) => ({ key: g.key, label: groupName(g, groupBy), value: g.count, meta: g.failed ? `${g.failed} failed` : 'No failures' }))} />
        </div>
      </section>
    </div>
  );
}
