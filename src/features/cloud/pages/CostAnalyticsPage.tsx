import { useMemo, useState } from 'react';
import { CloudConnectionGate } from '../components/CloudConnectionGate';
import { Link } from 'react-router-dom';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cloudInsightsRepository, type CloudProviderId, type CostBreakdownRow } from '../../../data-access';
import { BarList } from '../../../shared/ui/BarList';
import { Select } from '../../../shared/ui/Select';
import { downloadCsv } from '../../../shared/lib/csv';
import { fireToast } from '../../../shared/lib/toastEvents';
import { useOpenOnArrival } from '../../../shared/lib/useOpenOnArrival';
import { oneOf, useRememberedState } from '../../../shared/lib/useRememberedState';
import { useMaveraTheme } from '../../../shared/theme/ThemeProvider';
import { chartColors } from '../../../shared/theme/tokens';
import { PROVIDER_LABEL, formatChange, formatMoney, monthLabel, percentChange } from '../model/cloudFormat';
import { PageHeader } from '../../../shared/ui/PageHeader';

type ProviderScope = 'usd' | CloudProviderId;
type GroupBy = 'services' | 'regions' | 'accounts';
const RANGES = [3, 6, 12] as const;
const GROUP_LABEL: Record<GroupBy, string> = { services: 'Service', regions: 'Region', accounts: 'Account' };
const SCOPE_LABEL: Record<ProviderScope, string> = { usd: 'All USD providers', azure: 'Azure', aws: 'AWS', gcp: 'Google Cloud', btp: 'SAP BTP (EUR)' };
const USD_PROVIDERS: CloudProviderId[] = ['azure', 'aws', 'gcp'];
const VIEWS_KEY = 'mv-cost-analytics-views';

interface SavedView { name: string; scope: ProviderScope; range: number; groupBy: GroupBy }

function loadViews(): SavedView[] {
  try { return JSON.parse(localStorage.getItem(VIEWS_KEY) ?? '[]') as SavedView[]; } catch { return []; }
}

/**
 * CLOUD-03 — cost over time and by service, region or account. Amounts are only added up within
 * one currency: Azure, AWS and Google Cloud report USD; SAP BTP reports EUR and is analysed on
 * its own. Table and chart always share the same scope.
 */
function CostAnalyticsPageContent() {
  const data = useMemo(() => cloudInsightsRepository.getCostAnalytics(), []);
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  const [scope, setScope] = useRememberedState<ProviderScope>('cloud', 'analytics-scope', 'usd', oneOf(['usd', 'azure', 'aws', 'gcp', 'btp']));
  const [range, setRange] = useRememberedState<number>('cloud', 'analytics-range', 6, oneOf([...RANGES]));
  const [groupBy, setGroupBy] = useRememberedState<GroupBy>('cloud', 'analytics-group', 'services', oneOf(['services', 'regions', 'accounts']));
  const [selected, setSelected] = useState<string | null>(null);
  const [views, setViews] = useState<SavedView[]>(loadViews);

  const providers: CloudProviderId[] = scope === 'usd' ? USD_PROVIDERS : [scope];
  const currency = scope === 'btp' ? 'EUR' : 'USD';

  const months = useMemo(() => [...new Set(data.monthly.map((m) => m.month))].sort().slice(-range), [data, range]);
  const trend = months.map((month) => {
    const point: Record<string, string | number | null> = { month: monthLabel(month) };
    for (const p of providers) point[p] = data.monthly.find((m) => m.month === month && m.provider === p)?.cost ?? null;
    return point;
  });
  const totalFor = (month: string) => data.monthly.filter((m) => m.month === month && providers.includes(m.provider)).reduce((sum, m) => sum + m.cost, 0);
  const current = totalFor(data.currentMonth);
  const previousMonth = months[months.length - 2];
  const comparableProviders = providers.filter((p) => !data.providersWithoutHistory.includes(p));
  const comparableCurrent = data.monthly.filter((m) => m.month === data.currentMonth && comparableProviders.includes(m.provider)).reduce((s, m) => s + m.cost, 0);
  const comparablePrevious = previousMonth ? data.monthly.filter((m) => m.month === previousMonth && comparableProviders.includes(m.provider)).reduce((s, m) => s + m.cost, 0) : 0;
  const monthChange = percentChange(comparableCurrent, comparablePrevious || null);
  const rangeTotal = months.reduce((sum, month) => sum + totalFor(month), 0);

  const rows: CostBreakdownRow[] = data[groupBy].filter((r) => providers.includes(r.provider)).sort((a, b) => b.cost - a.cost);
  const rowsTotal = rows.reduce((sum, r) => sum + r.cost, 0);
  const missingGroup = providers.filter((p) => !data[groupBy].some((r) => r.provider === p));
  const rowKey = (r: CostBreakdownRow) => `${r.provider}:${r.name}`;
  const selectedRow = rows.find((r) => rowKey(r) === selected);

  const exportRows = () => downloadCsv(`cost-by-${GROUP_LABEL[groupBy].toLowerCase()}-${data.currentMonth}.csv`, [GROUP_LABEL[groupBy], 'Provider', `Cost (${currency})`, 'Share %', `Last month (${currency})`, 'Change %'],
    rows.map((r) => [r.name, PROVIDER_LABEL[r.provider], r.cost, rowsTotal ? Math.round((r.cost / rowsTotal) * 1000) / 10 : 0, r.previousCost ?? '', percentChange(r.cost, r.previousCost) ?? '']));

  // Ctrl+K "Export cost report" downloads the report for the view as it stands.
  useOpenOnArrival('export', () => {
    if (rows.length === 0) return;
    exportRows();
    fireToast({ type: 'success', message: 'Cost report exported.' });
  });

  const saveView = () => {
    const name = `${SCOPE_LABEL[scope]} · ${range} months · by ${GROUP_LABEL[groupBy].toLowerCase()}`;
    const next = [{ name, scope, range, groupBy }, ...views.filter((v) => v.name !== name)].slice(0, 6);
    setViews(next);
    try { localStorage.setItem(VIEWS_KEY, JSON.stringify(next)); } catch { /* storage unavailable: keep for this visit */ }
    fireToast({ type: 'success', message: `Saved view “${name}”.` });
  };
  const applyView = (view: SavedView) => { setScope(view.scope); setRange(view.range); setGroupBy(view.groupBy); setSelected(null); };

  return (
    <div>
      <PageHeader title="Cost Analytics" subtitle="Investigate spend over time and by service, region or account.">
        <button type="button" className="mv-secondary-button" onClick={saveView}>Save view</button>
        <button type="button" className="mv-primary-button" onClick={exportRows} disabled={rows.length === 0}>Export report</button>
      </PageHeader>

      <div className="mv-filter-bar" role="search" aria-label="Cost analytics scope">
        <Select label="Providers" value={scope} onChange={(v) => { setScope(v); setSelected(null); }} options={(Object.keys(SCOPE_LABEL) as ProviderScope[]).map((v) => ({ value: v, label: SCOPE_LABEL[v] }))} />
        <Select label="Range" value={range} onChange={setRange} options={RANGES.map((r) => ({ value: r, label: `Last ${r} months` }))} />
        <Select label="Group by" value={groupBy} onChange={(v) => { setGroupBy(v); setSelected(null); }} options={(Object.keys(GROUP_LABEL) as GroupBy[]).map((g) => ({ value: g, label: GROUP_LABEL[g] }))} />
        {views.length > 0 && (
          <div className="mv-saved-views" aria-label="Saved views">
            {views.map((view) => <button key={view.name} type="button" className="mv-chip" onClick={() => applyView(view)}>{view.name}</button>)}
          </div>
        )}
      </div>

      {scope === 'usd' && <p className="mv-notice">SAP BTP is billed in EUR, so it isn’t added to these USD totals. Choose “SAP BTP (EUR)” to analyse it.</p>}

      <div className="mv-kpi-row-4">
        <article className="mv-kpi"><span className="mv-kpi-label">This month</span><strong className="mv-kpi-value">{formatMoney(current, currency)}</strong><span className="mv-muted">{monthLabel(data.currentMonth)} to date</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Change vs last month</span><strong className="mv-kpi-value">{formatChange(monthChange)}</strong><span className="mv-muted">{comparableProviders.length < providers.length ? `Excludes ${providers.filter((p) => !comparableProviders.includes(p)).map((p) => PROVIDER_LABEL[p]).join(', ')} (no history)` : 'Same providers, month to date'}</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Last {range} months</span><strong className="mv-kpi-value">{formatMoney(rangeTotal, currency, { compact: true })}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Monthly average</span><strong className="mv-kpi-value">{formatMoney(rangeTotal / Math.max(1, months.length), currency, { compact: true })}</strong></article>
      </div>

      <section className="mv-panel" aria-labelledby="trend-title" style={{ marginBottom: '1rem' }}>
        <div className="mv-panel-header">
          <div><h2 className="mv-panel-title" id="trend-title">Monthly cost by provider</h2><p className="mv-muted">{currency}, last {range} months</p></div>
        </div>
        {providers.some((p) => data.providersWithoutHistory.includes(p)) && (
          <p className="mv-muted">Google Cloud only has the current month synced, so it shows as a single point.</p>
        )}
        <div role="img" aria-label={`Monthly cost by provider, ${currency}`} style={{ height: '16.25rem' }}>
          <ResponsiveContainer>
            <LineChart data={trend}>
              <CartesianGrid stroke={colors.grid} vertical={false} />
              <XAxis dataKey="month" stroke={colors.axis} tick={{ fontSize: 11 }} />
              <YAxis stroke={colors.axis} tick={{ fontSize: 11 }} width={64} tickFormatter={(v: number) => formatMoney(v, currency, { compact: true })} />
              <Tooltip formatter={(v) => formatMoney(Number(v), currency)} />
              <Legend />
              {providers.map((p, i) => (
                <Line key={p} type="monotone" dataKey={p} name={PROVIDER_LABEL[p]} stroke={[colors.primary, colors.tertiary, colors.secondary][i % 3]} strokeWidth={2} connectNulls={false} dot={{ r: 3 }} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mv-panel" aria-labelledby="breakdown-title">
        <div className="mv-panel-header">
          <div><h2 className="mv-panel-title" id="breakdown-title">Cost by {GROUP_LABEL[groupBy].toLowerCase()}</h2><p className="mv-muted">{monthLabel(data.currentMonth)} to date · change against the same {GROUP_LABEL[groupBy].toLowerCase()} last month</p></div>
        </div>
        {missingGroup.length > 0 && <p className="mv-muted">{GROUP_LABEL[groupBy]} breakdown isn’t available for {missingGroup.map((p) => PROVIDER_LABEL[p]).join(', ')}.</p>}
        {rows.length === 0 ? (
          <div className="mv-empty-inline"><p><strong>No {GROUP_LABEL[groupBy].toLowerCase()} data for this scope.</strong></p></div>
        ) : (
          <div className="mv-columns-16-8">
            <div className="mv-table-wrap">
              <table className="mv-table mv-table--stack">
                <thead><tr><th>{GROUP_LABEL[groupBy]}</th><th>Provider</th><th className="mv-num">Cost</th><th className="mv-num">Share</th><th className="mv-num">Change</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={rowKey(r)} className={selected === rowKey(r) ? 'is-selected' : undefined}>
                      <td data-label={GROUP_LABEL[groupBy]} className="mv-stack-title"><button type="button" className="mv-link-button" aria-pressed={selected === rowKey(r)} onClick={() => setSelected(selected === rowKey(r) ? null : rowKey(r))}>{r.name}</button></td>
                      <td data-label="Provider">{PROVIDER_LABEL[r.provider]}</td>
                      <td data-label="Cost" className="mv-num">{formatMoney(r.cost, r.currency)}</td>
                      <td data-label="Share" className="mv-num">{rowsTotal ? `${((r.cost / rowsTotal) * 100).toFixed(1)}%` : '—'}</td>
                      <td data-label="Change" className="mv-num">{r.previousCost === null ? <span className="mv-muted">No history</span> : formatChange(percentChange(r.cost, r.previousCost))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <BarList
                label={`Top ${GROUP_LABEL[groupBy].toLowerCase()}s by cost`}
                items={rows.slice(0, 8).map((r) => ({ key: rowKey(r), label: r.name, value: r.cost, display: formatMoney(r.cost, r.currency, { compact: true }), meta: PROVIDER_LABEL[r.provider], selected: selected === rowKey(r), onSelect: () => setSelected(selected === rowKey(r) ? null : rowKey(r)) }))}
              />
              {selectedRow && (
                <div className="mv-selection-card" role="status">
                  <strong>{selectedRow.name}</strong>
                  <span className="mv-muted">{PROVIDER_LABEL[selectedRow.provider]} · {formatMoney(selectedRow.cost, selectedRow.currency)} this month{selectedRow.previousCost !== null ? ` · ${formatMoney(selectedRow.previousCost, selectedRow.currency)} last month` : ''}</span>
                  <span className="mv-selection-links">
                    <Link to="/cloud/resources">Open resources</Link>
                    <Link to="/cloud/optimization">Find savings</Link>
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export function CostAnalyticsPage() {
  return (
    <CloudConnectionGate title="Cost Analytics" subtitle="Investigate spend over time and by service, region or account." willShow="spend over time and by service, region or account">
      <CostAnalyticsPageContent />
    </CloudConnectionGate>
  );
}
