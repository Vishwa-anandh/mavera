import { useEffect, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CumulativePoint } from '../lib/costAnalysis';
import { useMaveraTheme } from '../theme/ThemeProvider';
import { chartColors } from '../theme/tokens';

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const axisMoney = (value: number) => (value >= 1000 ? `$${(value / 1000).toFixed(1).replace(/\.0$/, '')}k` : `$${Math.round(value)}`);
function shortDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Cumulative spend through the month as an area, continued to month end as a dashed line at the average
 * daily rate so far. Has the usual keyboard-reachable "View data" table.
 */
export function CumulativeSpendChart({ data, title }: { data: CumulativePoint[]; title: string }) {
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  const [tableOpen, setTableOpen] = useState(false);

  useEffect(() => {
    if (!tableOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setTableOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [tableOpen]);

  if (data.length === 0) return <p className="mv-muted">No spend history available for this period.</p>;
  const hasProjection = data.some((point) => point.projected !== undefined && point.actual === undefined);

  return (
    <div>
      <div role="img" aria-label={title} style={{ width: '100%', height: '14rem' }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={colors.grid} vertical={false} />
            <XAxis dataKey="date" stroke={colors.axis} tick={{ fontSize: 11 }} tickLine={false} tickFormatter={shortDate} minTickGap={16} />
            <YAxis stroke={colors.axis} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => axisMoney(Number(value))} width={48} />
            <Tooltip formatter={(value, name) => [money(Number(value)), name === 'projected' ? 'Projected' : 'Spend so far']} labelFormatter={(label) => shortDate(String(label))} contentStyle={{ borderRadius: 8, borderColor: colors.grid }} />
            <Area type="monotone" dataKey="actual" stroke={colors.primary} strokeWidth={2} fill={colors.primary} fillOpacity={0.12} isAnimationActive={false} connectNulls />
            {hasProjection && <Line type="monotone" dataKey="projected" stroke={colors.secondary} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} connectNulls />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mv-chart-legend" aria-hidden="true">
        <span><i className="mv-chart-swatch" style={{ background: colors.primary }} />Spend so far</span>
        {hasProjection && <span><i className="mv-chart-swatch mv-chart-swatch--dashed" style={{ borderColor: colors.secondary }} />Projected at the current daily rate</span>}
      </div>
      <button type="button" className="mv-quiet-button" onClick={() => setTableOpen(true)}>View data</button>
      {tableOpen && (
        <div className="mv-dialog-backdrop" onClick={() => setTableOpen(false)}>
          <section className="mv-dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
            <div className="mv-panel-header">
              <h2 className="mv-panel-title">{title}</h2>
              <button type="button" className="mv-icon-button" aria-label="Close data table" onClick={() => setTableOpen(false)}>×</button>
            </div>
            <div className="mv-table-wrap">
              <table className="mv-table">
                <thead><tr><th>Date</th><th className="mv-num">Spend so far</th><th className="mv-num">Projected</th></tr></thead>
                <tbody>
                  {data.map((point) => (
                    <tr key={point.date}>
                      <td>{shortDate(point.date)}</td>
                      <td className="mv-num">{point.actual !== undefined ? money(point.actual) : '—'}</td>
                      <td className="mv-num">{point.projected !== undefined ? money(point.projected) : '—'}</td>
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
