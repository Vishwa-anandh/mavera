import type { GcpCostTabProps } from '../../model/GcpCostTabProps';
import { SpendTrendChart } from '../../../../shared/ui/SpendTrendChart';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

/**
 * Technical tab — Engineer / in-depth audience. Ported from the reference
 * CCM app's GCP cost page technical block: "Daily Cost Trend", "Regions &
 * Zones" (GCP bundles both under one field), "Resource Types" (a coarse
 * cost-by-type rollup, not a per-instance inventory — the reference genuinely
 * has no VM/bucket/dataset-level table), a "3-Month Cost Forecast", and a
 * plain-text snapshot/API-metrics footer.
 */
export function TechnicalTab(props: GcpCostTabProps) {
  const { data } = props;
  const dailyAvg = data.dailyCosts.length > 0 ? data.totalCost / data.dailyCosts.length : 0;
  const dailyTrend = data.dailyCosts.map((point) => ({ date: point.date, amount: point.cost }));
  const sortedLocations = [...data.locations].sort((a, b) => b.cost - a.cost);
  const sortedResourceTypes = [...data.resourceTypes].sort((a, b) => b.cost - a.cost);

  return (
    <div>
      <section className="mv-panel" id="gcp-daily-trend" style={{ marginBottom: '1rem' }}>
        <div className="mv-panel-header"><h2 className="mv-panel-title">Daily Cost Trend</h2></div>
        {dailyTrend.length === 0 ? (
          <p className="mv-muted">No daily data — sync the account to populate daily cost trends.</p>
        ) : (
          <>
            <p className="mv-muted" style={{ marginBottom: '0.75rem' }}>Average daily spend: <strong style={{ color: 'var(--mv-text)' }}>{formatCurrency(dailyAvg)}</strong></p>
            <SpendTrendChart title="Daily cost trend" data={dailyTrend} />
          </>
        )}
      </section>

      {sortedLocations.length > 0 && (
        <section className="mv-panel" id="gcp-region" style={{ marginBottom: '1rem' }}>
          <div className="mv-panel-header"><h2 className="mv-panel-title">Regions &amp; Zones ({sortedLocations.length})</h2></div>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {sortedLocations.slice(0, 12).map((loc) => {
              const pct = data.totalCost > 0 ? (loc.cost / data.totalCost) * 100 : 0;
              const max = Math.max(...sortedLocations.map((l) => l.cost), 1);
              return (
                <div key={loc.name} style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem', fontSize: '0.8125rem', minWidth: 0 }}>
                    <span className="mv-muted">{loc.name}</span>
                    <span style={{ display: 'flex', gap: '0.5rem' }}><strong>{formatCurrency(loc.cost)}</strong><span className="mv-muted">{pct.toFixed(1)}%</span></span>
                  </div>
                  <div style={{ height: '0.375rem', borderRadius: '62.4375rem', background: 'var(--mv-divider)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '62.4375rem', width: `${(loc.cost / max) * 100}%`, background: 'var(--mv-primary)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {sortedResourceTypes.length > 0 && (
        <section className="mv-panel" style={{ marginBottom: '1rem' }}>
          <div className="mv-panel-header"><h2 className="mv-panel-title">Resource Types ({sortedResourceTypes.length})</h2></div>
          <div className="mv-table-wrap">
            <table className="mv-table">
              <thead><tr><th>Resource Type</th><th className="mv-num">MTD Cost</th><th className="mv-num">Share</th></tr></thead>
              <tbody>
                {sortedResourceTypes.slice(0, 15).map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td className="mv-num">{formatCurrency(r.cost)}</td>
                    <td className="mv-num">{data.totalCost > 0 ? `${((r.cost / data.totalCost) * 100).toFixed(1)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {data.forecastData.length > 0 && (
        <section className="mv-panel" style={{ marginBottom: '1rem' }}>
          <div className="mv-panel-header">
            <h2 className="mv-panel-title">3-Month Cost Forecast</h2>
            <span className="mv-status mv-status--info">EOM: {formatCurrency(data.forecastData[0].projected_cost)}</span>
          </div>
          <div className="mv-service-tile-grid">
            {data.forecastData.map((f, i) => {
              const prev = data.forecastData[i - 1];
              const delta = prev ? ((f.projected_cost - prev.projected_cost) / prev.projected_cost) * 100 : null;
              return (
                <div className="mv-service-tile" key={f.month}>
                  <span className="mv-service-tile-name">{f.month}</span>
                  <strong>{formatCurrency(f.projected_cost)}</strong>
                  {delta !== null && <span className={delta >= 0 ? 'mv-text-warning' : 'mv-muted'}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%</span>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <p className="mv-muted">
        Snapshot: {data.snapshotTime ? new Date(data.snapshotTime).toLocaleString() : 'Just now'} · {data.services.length} services · {data.currency}
      </p>
    </div>
  );
}
