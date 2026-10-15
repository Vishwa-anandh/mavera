import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMaveraTheme } from '../theme/ThemeProvider';
import { chartColors } from '../theme/tokens';

export interface BarSeries {
  key: string;
  label: string;
  /** Overrides the theme colour, so a series keeps the colour it has elsewhere on the page (e.g. a provider's brand dot). */
  color?: string;
}

export interface BarSeriesChartProps {
  /** Accessible name; also the title of the "View data" table. */
  title: string;
  /** One object per category: `{ name, <seriesKey>: number, … }`. */
  data: Array<Record<string, number | string>>;
  series: BarSeries[];
  /** Stack the series instead of drawing them side by side. */
  stacked?: boolean;
  /** Draws a labelled line at this value, e.g. an 80% load threshold. */
  threshold?: { value: number; label: string };
  /** Tooltip and data-table value formatter, e.g. `(v) => `${v}%``. */
  format?: (value: number) => string;
  /** Shorter formatter for the value axis (e.g. "$12K"); falls back to `format`. */
  axisFormat?: (value: number) => string;
  height?: number;
}

/**
 * Grouped or stacked bars over categories, with an optional threshold line. Series take their colours
 * from the theme's chart roles in a fixed order (primary, secondary, tertiary, then the neutral axis
 * tone), never cycled, so a series keeps its colour whatever else is shown. Follows the SpendTrendChart
 * pattern: a labelled chart plus a keyboard-accessible "View data" table.
 */
export function BarSeriesChart({ title, data, series, stacked = false, threshold, format = (v) => v.toLocaleString(), axisFormat, height = 240 }: BarSeriesChartProps) {
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  const palette = [colors.primary, colors.secondary, colors.tertiary, colors.axis];
  const [tableOpen, setTableOpen] = useState(false);

  if (data.length === 0) return <p className="mv-muted">No data available for this period.</p>;

  return (
    <div>
      <div role="img" aria-label={title} style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
            <CartesianGrid stroke={colors.grid} vertical={false} />
            <XAxis dataKey="name" stroke={colors.axis} tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis stroke={colors.axis} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => (axisFormat ?? format)(Number(v))} width={52} />
            <Tooltip cursor={{ fill: colors.grid, opacity: 0.5 }} formatter={(value, name) => [format(Number(value)), String(name)]} contentStyle={{ borderRadius: 8, borderColor: colors.grid }} />
            {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} itemSorter={null} />}
            {threshold && (
              <ReferenceLine y={threshold.value} stroke={colors.axis} strokeDasharray="4 4" label={{ value: threshold.label, position: 'insideTopRight', fontSize: 11, fill: colors.axis }} />
            )}
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color ?? palette[i % palette.length]}
                stackId={stacked ? 'stack' : undefined}
                radius={stacked ? 0 : [4, 4, 0, 0]}
                stroke={stacked ? 'var(--mv-surface)' : undefined}
                strokeWidth={stacked ? 2 : 0}
                maxBarSize={36}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <button type="button" className="mv-quiet-button" onClick={() => setTableOpen(true)}>View data</button>
      {tableOpen && (
        <div className="mv-dialog-backdrop" onClick={() => setTableOpen(false)}>
          <section className="mv-dialog mv-dialog--wide" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
            <div className="mv-panel-header">
              <h2 className="mv-panel-title">{title}</h2>
              <button type="button" className="mv-icon-button" aria-label="Close data table" onClick={() => setTableOpen(false)}>×</button>
            </div>
            <div className="mv-table-wrap">
              <table className="mv-table">
                <thead>
                  <tr><th>Category</th>{series.map((s) => <th key={s.key} className="mv-num">{s.label}</th>)}</tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={String(row.name)}>
                      <td>{String(row.name)}</td>
                      {series.map((s) => <td key={s.key} className="mv-num">{format(Number(row[s.key] ?? 0))}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
