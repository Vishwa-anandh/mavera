import { useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { dailyTotals, lastNDays, monthForecast, serviceStackKeys, stackDay, type DailyPoint, type MonthForecast } from '../lib/costAnalysis';
import { useMaveraTheme } from '../theme/ThemeProvider';
import { chartTint } from '../theme/chartTint';
import { chartColors } from '../theme/tokens';
import { ChartDataDialog } from './ChartDataDialog';
import { SegmentedToggle } from './SegmentedToggle';

type Range = '7d' | '14d' | '30d';
type TableKind = 'month' | 'total' | 'service';

const RANGE_DAYS: Record<Range, number> = { '7d': 7, '14d': 14, '30d': 30 };
const RANGE_OPTIONS = [
  { value: '7d' as const, label: '7d', ariaLabel: 'Last 7 days' },
  { value: '14d' as const, label: '14d', ariaLabel: 'Last 14 days' },
  { value: '30d' as const, label: '30d', ariaLabel: 'Last 30 days' },
];

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const axisMoney = (value: number) => (value >= 1000 ? `$${(value / 1000).toFixed(1).replace(/\.0$/, '')}k` : `$${Math.round(value)}`);

function parseDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}
const shortDate = (date: string) => parseDate(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const longDate = (date: string) => parseDate(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const monthName = (date: string) => parseDate(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

const AXIS_TICK = { fontSize: 12 };
const TOOLTIP_STYLE = { borderRadius: 8 };

export interface DailyCostHistoryProps {
  /** Date ordered daily costs; the 7, 14 and 30 day windows are cut from the end. Days may carry a per-service split. */
  series: DailyPoint[];
  title?: string;
  description?: string;
  /** Heading level for the title; use `h3` inside a page section that already has an `h2`. */
  headingLevel?: 'h2' | 'h3';
  /** Month-end forecast for the month the series ends in. When given, the projected days are spread so they add up to it. */
  forecastTotal?: number | null;
}

function forecastMethodText(forecast: MonthForecast): string {
  if (forecast.method === 'month-end forecast') return 'Projected days share the month-end forecast evenly.';
  if (forecast.method === 'last-7-day average') return 'Each projected day is the average of the last 7 actual days.';
  return '';
}

/**
 * Daily Cost History. Top: the month's spend day by day, actual days in the primary colour and projected days to
 * month end as lighter bars, with a dashed "Today" marker. Below, following the 7d | 14d | 30d switch: the daily
 * total as an area and a per-day stack of the three biggest services plus Other. Each chart has a keyboard-reachable
 * "View data" table; forecast rows are labelled as forecast. The switch is a group of pressed-state buttons, not tabs.
 */
export function DailyCostHistory({ series, title = 'Daily Cost History', description = 'Actual spend per day, by service', headingLevel = 'h2', forecastTotal }: DailyCostHistoryProps) {
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  const [range, setRange] = useState<Range>('30d');
  const [table, setTable] = useState<TableKind | null>(null);
  const Heading = headingLevel;
  const SubHeading = headingLevel === 'h2' ? 'h3' : 'h4';

  const forecast = monthForecast(series, { forecastTotal });
  const windowed = lastNDays(series, RANGE_DAYS[range]);
  const totals = dailyTotals(windowed);
  const stackKeys = serviceStackKeys(series, 3);
  const serviceColors = [colors.primary, colors.secondary, colors.tertiary];
  // The stack order is fixed (biggest service first, Other on top) and each service keeps its colour whatever the range.
  const stackSpecs = [
    ...stackKeys.map((name, index) => ({ key: `s${index}`, name, color: serviceColors[index] })),
    { key: 'other', name: 'Other', color: chartTint(colors.axis, mode, 0.45) },
  ];
  const stackNames = stackSpecs.map((spec) => spec.name);
  const stacked = windowed.map((point) => stackDay(point, stackKeys));
  const stackRows = stacked.map((day) => ({ date: day.date, s0: day.parts[0], s1: day.parts[1], s2: day.parts[2], other: day.other }));

  const forecastColor = chartTint(colors.primary, mode, 0.38);
  const labelFor = (kind: TableKind) =>
    kind === 'month'
      ? `Daily cost, ${forecast && forecast.method === 'complete' ? monthName(forecast.todayDate) : 'this month'}`
      : kind === 'total'
        ? `Daily total, last ${windowed.length} days`
        : `Daily cost by service, last ${windowed.length} days`;

  return (
    <section className="mv-panel mv-daily-history" aria-label={title}>
      <div className="mv-panel-header mv-daily-history-head">
        <div>
          <Heading className="mv-panel-title">{title}</Heading>
          <p className="mv-muted mv-daily-history-sub">{description}</p>
        </div>
        <div className="mv-daily-history-controls">
          <SegmentedToggle label="Date range" options={RANGE_OPTIONS} value={range} onChange={setRange} />
        </div>
      </div>

      {series.length === 0 || !forecast ? (
        <p className="mv-muted">No daily cost data is available for this period.</p>
      ) : (
        <>
          <div className="mv-chart-block">
            <div className="mv-chart-block-head">
              <SubHeading className="mv-chart-block-title">{forecast.method === 'complete' ? `Daily cost, ${monthName(forecast.todayDate)}` : 'Daily cost, this month'}</SubHeading>
              <ul className="mv-chart-legend" aria-label="Legend">
                <li><i className="mv-chart-swatch" style={{ background: colors.primary }} />Actual cost</li>
                {forecast.method !== 'complete' && <li><i className="mv-chart-swatch" style={{ background: forecastColor }} />Projected forecast</li>}
              </ul>
            </div>
            <p className="mv-muted mv-chart-note">
              {money(forecast.actualTotal)} so far
              {forecast.method !== 'complete' && <> · {money(forecast.projectedTotal)} projected for the other {forecast.daysInMonth - forecast.todayIndex - 1} days · {money(forecast.monthEndTotal)} at month end.</>}
              {forecast.method !== 'complete' && <span className="mv-chart-note-method"> {forecastMethodText(forecast)}</span>}
            </p>
            <div className="mv-chart-box" role="img" aria-label={labelFor('month')}>
              <ResponsiveContainer>
                <BarChart data={forecast.rows} margin={{ top: 22, right: 8, bottom: 0, left: 0 }} barCategoryGap="22%">
                  <CartesianGrid stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="date" stroke={colors.axis} tick={AXIS_TICK} tickLine={false} tickFormatter={shortDate} minTickGap={14} />
                  <YAxis stroke={colors.axis} tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(value) => axisMoney(Number(value))} width={52} />
                  <Tooltip cursor={{ fill: colors.grid, opacity: 0.5 }} formatter={(value, name) => [money(Number(value)), String(name)]} labelFormatter={(label) => longDate(String(label))} contentStyle={{ ...TOOLTIP_STYLE, borderColor: colors.grid }} />
                  <Bar dataKey="actual" name="Actual cost" stackId="day" fill={colors.primary} maxBarSize={28} isAnimationActive={false} />
                  <Bar dataKey="projected" name="Projected forecast" stackId="day" fill={forecastColor} maxBarSize={28} isAnimationActive={false} />
                  {forecast.method !== 'complete' && (
                    <ReferenceLine x={forecast.todayDate} stroke={colors.axis} strokeDasharray="4 3" strokeWidth={1.5} label={{ value: 'Today', position: 'top', fill: colors.axis, fontSize: 12 }} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <button type="button" className="mv-quiet-button" aria-label={`View data: ${labelFor('month')}`} onClick={() => setTable('month')}>View data</button>
          </div>

          <p className="mv-daily-history-summary" aria-live="polite">
            <span className="mv-muted">Last {windowed.length} days</span>
            <span><span className="mv-muted">Total</span> <strong>{money(totals.total)}</strong></span>
            <span><span className="mv-muted">Daily average</span> <strong>{money(totals.average)}</strong></span>
            {totals.peak && <span><span className="mv-muted">Peak day</span> <strong>{money(totals.peak.cost)}</strong> <span className="mv-muted">on {shortDate(totals.peak.date)}</span></span>}
          </p>

          <div className="mv-chart-pair">
            <div className="mv-chart-block">
              <div className="mv-chart-block-head">
                <SubHeading className="mv-chart-block-title">Daily total</SubHeading>
              </div>
              <div className="mv-chart-box" role="img" aria-label={labelFor('total')}>
                <ResponsiveContainer>
                  <AreaChart data={windowed} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={colors.grid} vertical={false} />
                    <XAxis dataKey="date" stroke={colors.axis} tick={AXIS_TICK} tickLine={false} tickFormatter={shortDate} minTickGap={20} />
                    <YAxis stroke={colors.axis} tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(value) => axisMoney(Number(value))} width={52} />
                    <Tooltip formatter={(value) => [money(Number(value)), 'Daily total']} labelFormatter={(label) => longDate(String(label))} contentStyle={{ ...TOOLTIP_STYLE, borderColor: colors.grid }} />
                    <Area type="monotone" dataKey="cost" stroke={colors.primary} strokeWidth={2} fill={colors.primary} fillOpacity={0.12} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <button type="button" className="mv-quiet-button" aria-label={`View data: ${labelFor('total')}`} onClick={() => setTable('total')}>View data</button>
            </div>

            {stackKeys.length > 0 && (
              <div className="mv-chart-block">
                <div className="mv-chart-block-head">
                  <SubHeading className="mv-chart-block-title">By service</SubHeading>
                  <ul className="mv-chart-legend" aria-label="Services">
                    {stackSpecs.map((spec) => (
                      <li key={spec.key}><i className="mv-chart-swatch" style={{ background: spec.color }} />{spec.name}</li>
                    ))}
                  </ul>
                </div>
                <div className="mv-chart-box" role="img" aria-label={labelFor('service')}>
                  <ResponsiveContainer>
                    <BarChart data={stackRows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="20%">
                      <CartesianGrid stroke={colors.grid} vertical={false} />
                      <XAxis dataKey="date" stroke={colors.axis} tick={AXIS_TICK} tickLine={false} tickFormatter={shortDate} minTickGap={20} />
                      <YAxis stroke={colors.axis} tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(value) => axisMoney(Number(value))} width={52} />
                      <Tooltip cursor={{ fill: colors.grid, opacity: 0.5 }} formatter={(value, name) => [money(Number(value)), String(name)]} labelFormatter={(label) => longDate(String(label))} contentStyle={{ ...TOOLTIP_STYLE, borderColor: colors.grid }} />
                      {stackSpecs.map((spec) => (
                        <Bar key={spec.key} dataKey={spec.key} name={spec.name} stackId="services" fill={spec.color} stroke="var(--mv-card-white, #fff)" strokeWidth={2} maxBarSize={28} isAnimationActive={false} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <button type="button" className="mv-quiet-button" aria-label={`View data: ${labelFor('service')}`} onClick={() => setTable('service')}>View data</button>
              </div>
            )}
          </div>
        </>
      )}

      {table && forecast && (
        <ChartDataDialog label={labelFor(table)} onClose={() => setTable(null)}>
          {table === 'month' && (
            <>
              <table className="mv-table">
                <thead><tr><th>Date</th><th>Type</th><th className="mv-num">Cost</th></tr></thead>
                <tbody>
                  {forecast.rows.filter((row) => row.actual !== null || row.projected !== null).map((row) => (
                    <tr key={row.date}>
                      <td>{longDate(row.date)}</td>
                      <td>{row.actual !== null ? 'Actual' : 'Forecast'}</td>
                      <td className="mv-num">{money((row.actual ?? row.projected) as number)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mv-muted mv-chart-note">Forecast rows are projections, not billed cost.</p>
            </>
          )}
          {table === 'total' && (
            <table className="mv-table">
              <thead><tr><th>Date</th><th className="mv-num">Cost</th></tr></thead>
              <tbody>
                {windowed.map((point) => (
                  <tr key={point.date}><td>{longDate(point.date)}</td><td className="mv-num">{money(point.cost)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          {table === 'service' && (
            <table className="mv-table">
              <thead><tr><th>Date</th>{stackNames.map((name) => <th key={name} className="mv-num">{name}</th>)}<th className="mv-num">Total</th></tr></thead>
              <tbody>
                {stacked.map((day) => (
                  <tr key={day.date}>
                    <td>{longDate(day.date)}</td>
                    {day.parts.map((part, index) => <td key={stackKeys[index]} className="mv-num">{money(part)}</td>)}
                    <td className="mv-num">{money(day.other)}</td>
                    <td className="mv-num">{money(day.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ChartDataDialog>
      )}
    </section>
  );
}
