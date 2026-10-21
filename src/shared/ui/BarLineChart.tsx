import { useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMaveraTheme } from '../theme/ThemeProvider';
import { chartColors, darkColors, lightColors } from '../theme/tokens';
import type { BarSeries } from './BarSeriesChart';

export interface BarLineChartProps {
  /** Accessible name; also the title of the "View data" table. */
  title: string;
  /** One object per category: `{ name, <seriesKey>: number, … }`. */
  data: Array<Record<string, number | string>>;
  /** Stacked bars, drawn against the left axis. */
  bars: BarSeries[];
  /** A line drawn against its own right-hand axis, for a quantity much smaller than the bars (e.g. a saving on a total). */
  line: { key: string; label: string };
  /** Formats the bar values in the tooltip, axis and data table. */
  format?: (value: number) => string;
  /** Shorter formatter for both value axes (e.g. "$12K"); falls back to the value formats. */
  axisFormat?: (value: number) => string;
  /** Formats the line values; defaults to `format`. */
  lineFormat?: (value: number) => string;
  height?: number;
}

/**
 * Stacked bars with one line on a second axis: the line is a different quantity from the bars (a saving against
 * an invoice total), so it gets its own right-hand scale instead of being squashed flat. Both axes are labelled
 * in the legend and the value formats, the line is dashed with dot markers so it is not told apart by colour
 * alone, and a keyboard-accessible "View data" table lists every value (MAVERA_DESIGN_SYSTEM.md 9.1).
 */
export function BarLineChart({ title, data, bars, line, format = (v) => v.toLocaleString(), axisFormat, lineFormat, height = 280 }: BarLineChartProps) {
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  const lineColor = (mode === 'dark' ? darkColors : lightColors).success;
  const palette = [colors.primary, colors.secondary, colors.tertiary, colors.axis];
  const [tableOpen, setTableOpen] = useState(false);
  const formatLine = lineFormat ?? format;

  if (data.length === 0) return <p className="mv-muted">No data available for this period.</p>;

  return (
    <div>
      <div role="img" aria-label={title} style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={colors.grid} vertical={false} />
            <XAxis dataKey="name" stroke={colors.axis} tick={{ fontSize: 12 }} tickLine={false} />
            <YAxis yAxisId="left" stroke={colors.axis} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => (axisFormat ?? format)(Number(v))} width={56} />
            <YAxis yAxisId="right" orientation="right" stroke={lineColor} tick={{ fontSize: 12, fill: lineColor }} tickLine={false} axisLine={false} tickFormatter={(v) => (axisFormat ?? formatLine)(Number(v))} width={56} />
            <Tooltip cursor={{ fill: colors.grid, opacity: 0.5 }} formatter={(value, name) => [name === line.label ? formatLine(Number(value)) : format(Number(value)), String(name)]} contentStyle={{ borderRadius: 8, borderColor: colors.grid }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} itemSorter={null} />
            {bars.map((s, i) => (
              <Bar key={s.key} yAxisId="left" dataKey={s.key} name={s.label} fill={s.color ?? palette[i % palette.length]} stackId="bars" maxBarSize={56} stroke="var(--mv-surface)" strokeWidth={2} isAnimationActive={false} />
            ))}
            <Line yAxisId="right" type="linear" dataKey={line.key} name={line.label} stroke={lineColor} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 4, fill: lineColor, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
          </ComposedChart>
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
                  <tr><th>Category</th>{bars.map((s) => <th key={s.key} className="mv-num">{s.label}</th>)}<th className="mv-num">{line.label}</th></tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={String(row.name)}>
                      <td>{String(row.name)}</td>
                      {bars.map((s) => <td key={s.key} className="mv-num">{format(Number(row[s.key] ?? 0))}</td>)}
                      <td className="mv-num">{formatLine(Number(row[line.key] ?? 0))}</td>
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
