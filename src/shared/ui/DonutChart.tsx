import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  title: string;
  data: DonutSlice[];
  totalLabel?: string;
}

/**
 * MAVERA_DESIGN_SYSTEM.md §9.1: donuts are for 2–4 mutually exclusive parts
 * of a real whole. Every analytical chart needs a keyboard-accessible "View
 * data" table alternative (§9.1) alongside the visual.
 */
export function DonutChart({ title, data, totalLabel }: DonutChartProps) {
  const [tableOpen, setTableOpen] = useState(false);
  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  if (total === 0) {
    return <p className="mv-muted">No data available for this period.</p>;
  }

  return (
    <div className="mv-donut-card">
      <div className="mv-donut-body" role="img" aria-label={title}>
        <div className="mv-donut-total">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" innerRadius="68%" outerRadius="98%" paddingAngle={1} stroke="none" isAnimationActive={false}>
                {data.map((slice) => (
                  <Cell key={slice.label} fill={slice.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [Number(value).toLocaleString(), String(name)]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mv-donut-total-label" aria-hidden>
            <strong>{total.toLocaleString()}</strong>
            <span>{totalLabel ?? 'Total'}</span>
          </div>
        </div>
        <div className="mv-donut-legend">
          {data.map((slice) => (
            <div className="mv-donut-legend-row" key={slice.label}>
              <span className="mv-donut-swatch" style={{ background: slice.color }} aria-hidden />
              <span>{slice.label}</span>
              <strong>{slice.value.toLocaleString()}</strong>
            </div>
          ))}
        </div>
      </div>
      <button className="mv-quiet-button" type="button" style={{ justifySelf: 'start' }} onClick={() => setTableOpen(true)}>
        View data
      </button>
      {tableOpen && (
        <div className="mv-dialog-backdrop" onClick={() => setTableOpen(false)}>
          <section className="mv-dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
            <div className="mv-panel-header">
              <h2 className="mv-panel-title">{title}</h2>
              <button className="mv-icon-button" aria-label="Close data table" onClick={() => setTableOpen(false)}>×</button>
            </div>
            <div className="mv-table-wrap">
              <table className="mv-table">
                <thead>
                  <tr><th>Category</th><th className="mv-num">Value</th></tr>
                </thead>
                <tbody>
                  {data.map((slice) => (
                    <tr key={slice.label}><td>{slice.label}</td><td className="mv-num">{slice.value.toLocaleString()}</td></tr>
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
