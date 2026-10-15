import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMaveraTheme } from '../../../shared/theme/ThemeProvider';
import { chartColors } from '../../../shared/theme/tokens';
import type { HanaVitalPoint } from '../../../demo/sap/mockHanaData';

/** CPU & Memory over 24h — same "chart + keyboard-accessible View data table"
 * pattern as SpendTrendChart, adapted to two series instead of one. */
export function HanaVitalsChart({ data }: { data: HanaVitalPoint[] }) {
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  const [tableOpen, setTableOpen] = useState(false);
  const avgCpu = (data.reduce((sum, p) => sum + p.cpuPercent, 0) / data.length).toFixed(1);
  const avgMem = (data.reduce((sum, p) => sum + p.memoryPercent, 0) / data.length).toFixed(1);

  return (
    <div>
      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '0.75rem', fontSize: '0.8125rem' }}>
        <span className="mv-muted">Avg CPU <strong style={{ color: 'var(--mv-text)' }}>{avgCpu}%</strong></span>
        <span className="mv-muted">Avg Memory <strong style={{ color: 'var(--mv-text)' }}>{avgMem}%</strong></span>
      </div>
      <div role="img" aria-label="CPU and memory performance over 24 hours" style={{ width: '100%', height: '16.25rem' }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid stroke={colors.grid} vertical={false} />
            <XAxis dataKey="time" stroke={colors.axis} tick={{ fontSize: 11 }} />
            <YAxis stroke={colors.axis} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip contentStyle={{ borderRadius: 8, borderColor: colors.grid }} />
            <Line type="monotone" dataKey="cpuPercent" name="CPU Usage" stroke={colors.secondary} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="memoryPercent" name="Memory Usage" stroke={colors.primary} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <button className="mv-quiet-button" onClick={() => setTableOpen(true)}>View data</button>
      {tableOpen && (
        <div className="mv-dialog-backdrop" onClick={() => setTableOpen(false)}>
          <section className="mv-dialog mv-dialog--wide" role="dialog" aria-modal="true" aria-label="CPU and memory performance over 24 hours" onClick={(e) => e.stopPropagation()}>
            <div className="mv-panel-header">
              <h2 className="mv-panel-title">System Vitals Timeline</h2>
              <button className="mv-icon-button" aria-label="Close data table" onClick={() => setTableOpen(false)}>×</button>
            </div>
            <div className="mv-table-wrap">
              <table className="mv-table">
                <thead><tr><th>Time</th><th className="mv-num">CPU</th><th className="mv-num">Memory</th></tr></thead>
                <tbody>
                  {data.map((point) => (
                    <tr key={point.time}><td>{point.time}</td><td className="mv-num">{point.cpuPercent}%</td><td className="mv-num">{point.memoryPercent}%</td></tr>
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
