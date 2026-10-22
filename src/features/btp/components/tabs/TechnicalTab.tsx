import type { BtpCostTabProps } from '../../model/BtpCostTabProps';
import { SpendTrendChart } from '../../../../shared/ui/SpendTrendChart';
import { Tooltip } from '../../../../shared/ui/Tooltip';

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

const FORECAST_SUB_LABELS = ['Current month projection', 'Next month estimate', '2 months ahead'];

/**
 * Technical tab — Engineer / in-depth audience. Ported from the reference
 * CCM app's BTP cost page technical block: "Monthly Cost Trend" (same
 * data as Operations, duplicated per the reference), "All Services" (full
 * list with concentration-risk badges), "Cost Forecast", a
 * "Snapshot & API Metrics" diagnostics card, and the big
 * "Cost by Subaccount × Service" breakdown.
 */
export function TechnicalTab(props: BtpCostTabProps) {
  const { data, yearlyData, account } = props;
  const currency = data.currency;
  const trendData = data.monthlySamples.map((point) => ({ date: point.date, amount: point.cost }));
  const sortedServices = [...data.services].sort((a, b) => b.cost - a.cost);

  const serviceSubaccountCounts = new Map<string, number>();
  data.servicesBySubaccount.forEach((sa) => sa.services.forEach((s) => serviceSubaccountCounts.set(s.name, (serviceSubaccountCounts.get(s.name) ?? 0) + 1)));

  const grandTotal = data.servicesBySubaccount.reduce((sum, sa) => sum + sa.totalCost, 0);

  return (
    <div>
      <section className="mv-panel" style={{ marginBottom: '1rem' }}>
        <div className="mv-panel-header"><h2 className="mv-panel-title">Monthly Cost Trend</h2></div>
        <SpendTrendChart title="Month-by-month BTP cost accumulation" data={trendData} />
      </section>

      <div className="mv-columns-16-8" style={{ marginBottom: '1rem' }}>
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">All Services ({sortedServices.length})</h2></div>
          {sortedServices.length === 0 ? <p className="mv-muted">No service data available.</p> : (
            <div className="mv-table-wrap">
              <table className="mv-table mv-table--stack">
                <thead><tr><th>#</th><th>Service</th><th className="mv-num">Cost</th><th className="mv-num">Share</th></tr></thead>
                <tbody>
                  {sortedServices.map((svc, i) => {
                    const pct = data.totalCost > 0 ? (svc.cost / data.totalCost) * 100 : 0;
                    const subCount = serviceSubaccountCounts.get(svc.name) ?? 0;
                    return (
                      <tr key={svc.name}>
                        <td data-label="#" className="mv-muted">{i + 1}</td>
                        <td data-label="Service">{svc.name}{subCount > 0 && <div className="mv-muted">{subCount} subaccount{subCount === 1 ? '' : 's'}</div>}</td>
                        <td data-label="Cost" className="mv-num">{formatCurrency(svc.cost, currency)}</td>
                        <td data-label="Share" className="mv-num"><span className={pct > 30 ? 'mv-status mv-status--warning' : undefined}>{pct.toFixed(1)}%</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="mv-column-stack">
          <section className="mv-panel">
            <div className="mv-panel-header"><h2 className="mv-panel-title">Cost Forecast</h2></div>
            {data.forecastData.length === 0 ? <p className="mv-muted">Insufficient data for forecast.</p> : (
              <div style={{ display: 'grid', gap: '0.625rem' }}>
                {data.forecastData.map((f, i) => (
                  <div key={f.month} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: i < data.forecastData.length - 1 ? '1px solid var(--mv-divider)' : undefined }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 500 }}>{f.month}{i === 0 && <span className="mv-status mv-status--info" style={{ marginLeft: '0.5rem' }}>Current</span>}</p>
                      <p className="mv-muted" style={{ margin: 0 }}>{FORECAST_SUB_LABELS[i] ?? ''}</p>
                    </div>
                    <strong>{formatCurrency(f.projected_cost, currency)}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mv-panel">
            <div className="mv-panel-header"><h2 className="mv-panel-title">Snapshot &amp; API Metrics</h2></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', fontSize: '0.8125rem' }}>
              <span className="mv-muted">COST_API</span><strong style={{ color: 'var(--mv-success)' }}>{account.targetUrl ? 'Connected' : '—'}</strong>
              <span className="mv-muted">CIS_Central</span><strong style={{ color: data.cisSucceeded ? 'var(--mv-success)' : 'var(--mv-warning)' }}>{data.cisSucceeded ? 'Connected' : 'Not configured'}</strong>
              <span className="mv-muted">Subaccounts w/ Services</span><strong>{data.servicesBySubaccount.length}</strong>
              <span className="mv-muted">Currency</span><strong>{currency}</strong>
              <span className="mv-muted">Monthly Samples</span><strong>{data.monthlySamples.length}</strong>
              <span className="mv-muted">Services Count</span><strong>{data.services.length}</strong>
              <span className="mv-muted">Environments</span><strong>{data.environments.length}</strong>
              <span className="mv-muted">Subaccounts</span><strong>{data.subaccounts.length}</strong>
              <span className="mv-muted">Directories (CIS)</span><strong>{data.directories.length}</strong>
              <span className="mv-muted">History Months</span><strong>{yearlyData.length}</strong>
              <span className="mv-muted">Snapshot TTL</span><strong>1 hour</strong>
            </div>
          </section>
        </div>
      </div>

      {data.servicesBySubaccount.length > 0 && (
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">Cost by Subaccount × Service ({data.servicesBySubaccount.length} subaccounts)</h2></div>
          <p className="mv-muted" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>COST_API service rows grouped per subaccount — plan names and usage included.</p>
          <div style={{ display: 'grid', gap: '0.875rem' }}>
            {data.servicesBySubaccount.map((sa) => {
              const pct = grandTotal > 0 ? (sa.totalCost / grandTotal) * 100 : 0;
              const visible = sa.services.slice(0, 6);
              return (
                <div key={sa.subaccountGuid} style={{ border: '1px solid var(--mv-divider)', borderRadius: '0.5rem', padding: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
                    <span aria-hidden style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: 'var(--mv-primary)', flexShrink: 0 }} />
                    <Tooltip content={sa.subaccountName}><strong style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sa.subaccountName}</strong></Tooltip>
                    <span className="mv-code mv-muted">{sa.subaccountGuid}</span>
                    <span className="mv-muted">{pct.toFixed(1)}%</span>
                    <strong>{formatCurrency(sa.totalCost, currency)}</strong>
                  </div>
                  <div style={{ height: '0.375rem', borderRadius: '62.4375rem', background: 'var(--mv-divider)', overflow: 'hidden', marginBottom: '0.75rem' }}>
                    <div style={{ height: '100%', borderRadius: '62.4375rem', width: `${pct}%`, background: 'var(--mv-primary)' }} />
                  </div>
                  <div className="mv-table-wrap">
                    <table className="mv-table mv-table--stack">
                      <thead><tr><th>Service</th><th>Usage</th><th className="mv-num">Cost</th><th className="mv-num">Share</th></tr></thead>
                      <tbody>
                        {visible.map((svc) => (
                          <tr key={svc.name}>
                            <td data-label="Service" className="mv-stack-title">{svc.name}{svc.planName && <span className="mv-code mv-muted" style={{ marginLeft: '0.5rem' }}>{svc.planName}</span>}</td>
                            <td data-label="Usage" className="mv-muted">{svc.usage.toLocaleString()}{svc.unit ? ` ${svc.unit}` : ''}</td>
                            <td data-label="Cost" className="mv-num">{formatCurrency(svc.cost, currency)}</td>
                            <td data-label="Share" className="mv-num">{sa.totalCost > 0 ? `${((svc.cost / sa.totalCost) * 100).toFixed(1)}%` : '—'}</td>
                          </tr>
                        ))}
                        {sa.services.length > 6 && (
                          <tr><td colSpan={4} className="mv-muted">+{sa.services.length - 6} more services</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
