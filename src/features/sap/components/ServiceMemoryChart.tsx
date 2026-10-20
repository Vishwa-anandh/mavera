import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMaveraTheme } from '../../../shared/theme/ThemeProvider';
import { chartColors } from '../../../shared/theme/tokens';
import type { HanaService } from '../../../data-access';
import { serviceMemoryRows } from '../model/hanaDetail';
import { ViewDataButton } from './ChartDataDialog';

const gb = (value: number) => `${value.toFixed(2)} GB`;

/** Memory by service as horizontal grouped bars: heap used, allocated and shared, largest heap first. */
export function ServiceMemoryChart({ services }: { services: HanaService[] }) {
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  const rows = serviceMemoryRows(services);
  const title = 'HANA memory by service';
  const height = Math.max(180, rows.length * 44 + 48);

  return (
    <div>
      <div role="img" aria-label={`${title}: heap used, allocated and shared memory per service in GB`} style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 0 }} barCategoryGap="24%" barGap={2}>
            <CartesianGrid stroke={colors.grid} horizontal={false} />
            <XAxis type="number" stroke={colors.axis} tick={{ fontSize: 11 }} tickLine={false} tickFormatter={(v) => `${v}`} unit=" GB" />
            <YAxis type="category" dataKey="name" stroke={colors.axis} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={112} />
            <Tooltip cursor={{ fill: colors.grid, opacity: 0.5 }} formatter={(value, name) => [gb(Number(value)), String(name)]} contentStyle={{ borderRadius: 8, borderColor: colors.grid }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="heapUsedGb" name="Heap used" fill={colors.primary} barSize={8} radius={[0, 3, 3, 0]} isAnimationActive={false} />
            <Bar dataKey="allocatedGb" name="Allocated" fill={colors.tertiary} barSize={8} radius={[0, 3, 3, 0]} isAnimationActive={false} />
            <Bar dataKey="sharedGb" name="Shared" fill={colors.secondary} barSize={8} radius={[0, 3, 3, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ViewDataButton
        title={title}
        columns={[{ header: 'Service' }, { header: 'Status' }, { header: 'Heap used', numeric: true }, { header: 'Allocated', numeric: true }, { header: 'Shared', numeric: true }]}
        rows={rows.map((r) => [r.name, r.status === 'running' ? 'Running' : 'Stopped', gb(r.heapUsedGb), gb(r.allocatedGb), gb(r.sharedGb)])}
      />
    </div>
  );
}
