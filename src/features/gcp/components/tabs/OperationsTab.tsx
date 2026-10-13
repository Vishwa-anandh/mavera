import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { GcpCostTabProps } from '../../model/GcpCostTabProps';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

/**
 * Operations tab — Manager / Dept-Head audience. Ported from the reference
 * CCM app's GCP cost page operations block: "Service Cost Breakdown" (bar
 * chart), "All Services" (full table with share bars) and "Projects"
 * (GCP's own cost-grouping dimension — analogous to AWS's region or
 * Azure's resource-group tables).
 */
export function OperationsTab(props: GcpCostTabProps) {
  const { data, chartColors } = props;
  const sortedServices = [...data.services].sort((a, b) => b.cost - a.cost);
  const chartData = sortedServices.slice(0, 10).map((s) => ({ name: s.name.length > 24 ? `${s.name.slice(0, 24)}…` : s.name, cost: s.cost }));
  const sortedProjects = [...data.projects].sort((a, b) => b.cost - a.cost);

  return (
    <div>
      <section className="mv-panel" style={{ marginBottom: 16 }}>
        <div className="mv-panel-header"><h2 className="mv-panel-title">Service Cost Breakdown</h2></div>
        {chartData.length === 0 ? (
          <p className="mv-muted">No service data — sync to load service breakdown.</p>
        ) : (
          <div role="img" aria-label="Service cost breakdown" style={{ width: '100%', height: Math.max(260, chartData.length * 38) }}>
            <ResponsiveContainer>
              <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                <CartesianGrid stroke={chartColors.grid} horizontal={false} />
                <XAxis type="number" stroke={chartColors.axis} tick={{ fontSize: 12 }} tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <YAxis type="category" dataKey="name" stroke={chartColors.axis} tick={{ fontSize: 12 }} width={160} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Cost']} contentStyle={{ borderRadius: 8, borderColor: chartColors.grid }} />
                <Bar dataKey="cost" fill={chartColors.primary} radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {sortedServices.length > 0 && (
        <section className="mv-panel" style={{ marginBottom: 16 }}>
          <div className="mv-panel-header"><h2 className="mv-panel-title">All Services ({sortedServices.length})</h2></div>
          <div className="mv-table-wrap">
            <table className="mv-table">
              <thead><tr><th>#</th><th>Service</th><th className="mv-num">MTD Cost</th><th>Share</th></tr></thead>
              <tbody>
                {sortedServices.map((svc, i) => (
                  <tr key={svc.name}>
                    <td className="mv-muted">{i + 1}</td>
                    <td>{svc.name}</td>
                    <td className="mv-num">{formatCurrency(svc.cost)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--mv-divider)', overflow: 'hidden', minWidth: 60 }}>
                          <div style={{ height: '100%', borderRadius: 999, width: `${Math.min(svc.percent, 100)}%`, background: 'var(--mv-primary)' }} />
                        </div>
                        <span className="mv-muted" style={{ flex: 'none' }}>{svc.percent.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {sortedProjects.length > 0 && (
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">Projects ({sortedProjects.length})</h2></div>
          <div className="mv-table-wrap">
            <table className="mv-table">
              <thead><tr><th>Project</th><th className="mv-num">MTD Cost</th><th className="mv-num">Share</th></tr></thead>
              <tbody>
                {sortedProjects.slice(0, 15).map((project) => (
                  <tr key={project.name}>
                    <td className="mv-code">{project.name}</td>
                    <td className="mv-num">{formatCurrency(project.cost)}</td>
                    <td className="mv-num">{data.totalCost > 0 ? `${((project.cost / data.totalCost) * 100).toFixed(1)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
