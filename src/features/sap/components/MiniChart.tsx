import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMaveraTheme } from '../../../shared/theme/ThemeProvider';
import { chartColors } from '../../../shared/theme/tokens';
import type { SapTrendPoint } from '../../../data-access';
import { ViewDataButton } from './ChartDataDialog';

interface MiniChartProps {
  /** Accessible name; also the heading of the card and the title of the View data table. */
  title: string;
  /** One line of context under the title, e.g. "Avg 4s · Max 8s". */
  summary: string;
  data: SapTrendPoint[];
  kind: 'bar' | 'area';
  /** Formats a value for the tooltip and the data table. */
  format?: (value: number) => string;
  /** Shorter formatter for the value axis ("48k"); falls back to `format`. */
  axisFormat?: (value: number) => string;
  valueLabel: string;
  timeLabel: string;
  /** Fixed value-axis range; omit to fit the data. */
  domain?: [number, number];
  /** Which chart colour role to use. */
  tone?: 'primary' | 'secondary' | 'tertiary';
}

/**
 * A compact chart for the Analytics grid: one series, a hairline grid, a one-line summary and View data.
 * Bars are used for counts and durations, an area for a level that moves over time.
 */
export function MiniChart({ title, summary, data, kind, format = (v) => v.toLocaleString(), axisFormat, valueLabel, timeLabel, domain, tone = 'primary' }: MiniChartProps) {
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  const color = colors[tone];
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <section className="mv-panel mv-mini-chart" aria-labelledby={`mini-${slug}`}>
      <div className="mv-mini-chart-head">
        <h3 id={`mini-${slug}`} className="mv-panel-title">{title}</h3>
        <p className="mv-muted">{summary}</p>
      </div>
      {data.length === 0 ? (
        <p className="mv-muted">No data available for this period.</p>
      ) : (
        <div role="img" aria-label={`${title}. ${summary}`} className="mv-mini-chart-plot">
          <ResponsiveContainer>
            {kind === 'bar' ? (
              <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="22%">
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis dataKey="time" stroke={colors.axis} tick={{ fontSize: 10 }} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                <YAxis stroke={colors.axis} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={34} allowDecimals={false} tickFormatter={(v) => (axisFormat ?? format)(Number(v))} domain={domain} />
                <Tooltip cursor={{ fill: colors.grid, opacity: 0.5 }} formatter={(value) => [format(Number(value)), valueLabel]} labelFormatter={(label) => `${timeLabel} ${label}`} contentStyle={{ borderRadius: 8, borderColor: colors.grid }} />
                <Bar dataKey="value" name={valueLabel} fill={color} radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />
              </BarChart>
            ) : (
              <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis dataKey="time" stroke={colors.axis} tick={{ fontSize: 10 }} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis stroke={colors.axis} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={34} tickFormatter={(v) => (axisFormat ?? format)(Number(v))} domain={domain ?? ['auto', 'auto']} />
                <Tooltip formatter={(value) => [format(Number(value)), valueLabel]} labelFormatter={(label) => `${timeLabel} ${label}`} contentStyle={{ borderRadius: 8, borderColor: colors.grid }} />
                <Area type="monotone" dataKey="value" name={valueLabel} stroke={color} strokeWidth={2} fill={color} fillOpacity={0.12} dot={false} isAnimationActive={false} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
      <ViewDataButton
        title={title}
        columns={[{ header: timeLabel }, { header: valueLabel, numeric: true }]}
        rows={data.map((p) => [p.time, format(p.value)])}
      />
    </section>
  );
}
