import { useEffect, useId, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { dailyTotals, lastNDays, type DailyPoint } from '../lib/costAnalysis';
import { useMaveraTheme } from '../theme/ThemeProvider';
import { chartColors } from '../theme/tokens';
import { SegmentedToggle } from './SegmentedToggle';

type Range = '7d' | '14d' | '30d';
type View = 'bar' | 'area';

const RANGE_DAYS: Record<Range, number> = { '7d': 7, '14d': 14, '30d': 30 };
const RANGE_OPTIONS = [
  { value: '7d' as const, label: '7d', ariaLabel: 'Last 7 days' },
  { value: '14d' as const, label: '14d', ariaLabel: 'Last 14 days' },
  { value: '30d' as const, label: '30d', ariaLabel: 'Last 30 days' },
];
const VIEW_OPTIONS = [
  { value: 'bar' as const, label: 'Bars', ariaLabel: 'Bar chart' },
  { value: 'area' as const, label: 'Area', ariaLabel: 'Area chart' },
];

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const axisMoney = (value: number) => (value >= 1000 ? `$${(value / 1000).toFixed(1).replace(/\.0$/, '')}k` : `$${Math.round(value)}`);

function parseDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}
const shortDate = (date: string) => parseDate(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const longDate = (date: string) => parseDate(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export interface DailyCostHistoryProps {
  /** Date ordered daily costs; the 7, 14 and 30 day windows are cut from the end. */
  series: DailyPoint[];
  title?: string;
  description?: string;
  /** Heading level for the title; use `h3` inside a page section that already has an `h2`. */
  headingLevel?: 'h2' | 'h3';
}

/**
 * Daily Cost History: spend per day over the last 7, 14 or 30 days, as bars or an area. The range and the
 * chart type are segmented toggles (pressed-state buttons, not tabs). The total, daily average and peak day
 * under the title follow the range and are announced politely, and "View data" lists every day in a table.
 */
export function DailyCostHistory({ series, title = 'Daily Cost History', description = 'Actual spend per day', headingLevel = 'h2' }: DailyCostHistoryProps) {
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  const [range, setRange] = useState<Range>('30d');
  const [view, setView] = useState<View>('bar');
  const [tableOpen, setTableOpen] = useState(false);
  const titleId = useId();
  const Heading = headingLevel;

  useEffect(() => {
    if (!tableOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setTableOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [tableOpen]);

  const windowed = lastNDays(series, RANGE_DAYS[range]);
  const totals = dailyTotals(windowed);
  const chartLabel = `${title}, last ${windowed.length} days`;

  return (
    <section className="mv-panel mv-daily-history" aria-labelledby={titleId}>
      <div className="mv-panel-header mv-daily-history-head">
        <div>
          <Heading className="mv-panel-title" id={titleId}>{title}</Heading>
          <p className="mv-muted mv-daily-history-sub">{description}</p>
        </div>
        <div className="mv-daily-history-controls">
          <SegmentedToggle label="Date range" options={RANGE_OPTIONS} value={range} onChange={setRange} />
          <SegmentedToggle label="Chart type" options={VIEW_OPTIONS} value={view} onChange={setView} />
        </div>
      </div>

      {series.length === 0 ? (
        <p className="mv-muted">No daily cost data is available for this period.</p>
      ) : (
        <>
          <p className="mv-daily-history-summary" aria-live="polite">
            <span><span className="mv-muted">Total</span> <strong>{money(totals.total)}</strong></span>
            <span><span className="mv-muted">Daily average</span> <strong>{money(totals.average)}</strong></span>
            {totals.peak && <span><span className="mv-muted">Peak day</span> <strong>{money(totals.peak.cost)}</strong> <span className="mv-muted">on {shortDate(totals.peak.date)}</span></span>}
          </p>
          <div role="img" aria-label={chartLabel} style={{ width: '100%', height: '15rem' }}>
            <ResponsiveContainer>
              {view === 'bar' ? (
                <BarChart data={windowed} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="22%">
                  <CartesianGrid stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="date" stroke={colors.axis} tick={{ fontSize: 11 }} tickLine={false} tickFormatter={shortDate} minTickGap={16} />
                  <YAxis stroke={colors.axis} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => axisMoney(Number(value))} width={48} />
                  <Tooltip cursor={{ fill: colors.grid, opacity: 0.5 }} formatter={(value) => [money(Number(value)), 'Cost']} labelFormatter={(label) => longDate(String(label))} contentStyle={{ borderRadius: 8, borderColor: colors.grid }} />
                  <Bar dataKey="cost" fill={colors.primary} radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                </BarChart>
              ) : (
                <AreaChart data={windowed} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="date" stroke={colors.axis} tick={{ fontSize: 11 }} tickLine={false} tickFormatter={shortDate} minTickGap={16} />
                  <YAxis stroke={colors.axis} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => axisMoney(Number(value))} width={48} />
                  <Tooltip formatter={(value) => [money(Number(value)), 'Cost']} labelFormatter={(label) => longDate(String(label))} contentStyle={{ borderRadius: 8, borderColor: colors.grid }} />
                  <Area type="monotone" dataKey="cost" stroke={colors.primary} strokeWidth={2} fill={colors.primary} fillOpacity={0.12} isAnimationActive={false} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
          <button type="button" className="mv-quiet-button" onClick={() => setTableOpen(true)}>View data</button>
        </>
      )}

      {tableOpen && (
        <div className="mv-dialog-backdrop" onClick={() => setTableOpen(false)}>
          <section className="mv-dialog" role="dialog" aria-modal="true" aria-label={chartLabel} onClick={(event) => event.stopPropagation()}>
            <div className="mv-panel-header">
              <h2 className="mv-panel-title">{chartLabel}</h2>
              <button type="button" className="mv-icon-button" aria-label="Close data table" onClick={() => setTableOpen(false)}>×</button>
            </div>
            <div className="mv-table-wrap">
              <table className="mv-table">
                <thead><tr><th>Date</th><th className="mv-num">Cost</th></tr></thead>
                <tbody>
                  {windowed.map((point) => (
                    <tr key={point.date}><td>{longDate(point.date)}</td><td className="mv-num">{money(point.cost)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
