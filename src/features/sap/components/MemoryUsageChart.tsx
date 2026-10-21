import { Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMaveraTheme } from '../../../shared/theme/ThemeProvider';
import { chartColors } from '../../../shared/theme/tokens';
import type { SapMemoryPoint } from '../../../data-access';
import { memoryStats } from '../model/sapPerformance';
import { ViewDataButton } from './ChartDataDialog';

const gb = (value: number) => `${value.toFixed(1)} GB`;

/** Application-server memory over the last 24 hours: what is in use against what is allocated. */
export function MemoryUsageChart({ series }: { series: SapMemoryPoint[] }) {
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  const stats = memoryStats(series);
  const title = 'Memory Usage';
  const summary = series.length === 0
    ? 'No memory data reported'
    : `Now ${gb(stats.usedGb)} of ${gb(stats.allocatedGb)}${stats.percent === null ? '' : ` (${stats.percent}%)`} · Peak ${gb(stats.peakGb)}`;

  return (
    <section className="mv-panel mv-mini-chart" aria-labelledby="mini-memory-usage">
      <div className="mv-mini-chart-head">
        <h3 id="mini-memory-usage" className="mv-panel-title">{title}</h3>
        <p className="mv-muted">{summary}</p>
      </div>
      {series.length === 0 ? (
        <p className="mv-muted">No data available for this period.</p>
      ) : (
        <div role="img" aria-label={`${title}. ${summary}`} className="mv-mini-chart-plot">
          <ResponsiveContainer>
            <AreaChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={colors.grid} vertical={false} />
              <XAxis dataKey="time" stroke={colors.axis} tick={{ fontSize: 10 }} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
              <YAxis stroke={colors.axis} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={34} tickFormatter={(v) => `${Math.round(Number(v))}`} domain={[0, Math.ceil(Math.max(stats.allocatedGb, stats.peakGb))]} tickCount={4} allowDecimals={false} />
              <Tooltip formatter={(value, name) => [gb(Number(value)), String(name)]} labelFormatter={(label) => `Hour ${label}`} contentStyle={{ borderRadius: 8, borderColor: colors.grid }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="usedGb" name="Used" stroke={colors.primary} strokeWidth={2} fill={colors.primary} fillOpacity={0.12} dot={false} isAnimationActive={false} />
              <Line type="stepAfter" dataKey="allocatedGb" name="Allocated" stroke={colors.tertiary} strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <ViewDataButton
        title={`${title}, last 24 hours`}
        columns={[{ header: 'Hour' }, { header: 'Used', numeric: true }, { header: 'Allocated', numeric: true }, { header: 'In use', numeric: true }]}
        rows={series.map((p) => [p.time, gb(p.usedGb), gb(p.allocatedGb), p.allocatedGb > 0 ? `${Math.round((p.usedGb / p.allocatedGb) * 100)}%` : '—'])}
      />
    </section>
  );
}
