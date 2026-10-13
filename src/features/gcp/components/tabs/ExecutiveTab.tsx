import type { GcpCostTabProps } from '../../model/GcpCostTabProps';
import type { AiInsight } from '../../model/gcpDerivations';
import { DonutChart } from '../../../../shared/ui/DonutChart';
import { Tooltip } from '../../../../shared/ui/Tooltip';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

/**
 * Executive tab — CEO / Leadership audience. Ported from the reference
 * CCM app's `gcp/pages/GcpCostPage.jsx` executive block: "Executive
 * Summary" (cost-at-a-glance + rule-based attention items + top 4
 * services), then "Service Cost Distribution" (donut) and a dedicated
 * "Maitsys CSP Savings" card side by side.
 */
export function ExecutiveTab(props: GcpCostTabProps & { aiInsights?: AiInsight[] }) {
  const { data, mspRate } = props;
  const mspSavings = data.totalCost * mspRate;
  const eomForecast = data.forecastData[0]?.projected_cost ?? null;

  const sortedServices = [...data.services].sort((a, b) => b.cost - a.cost);
  const topService = sortedServices[0];

  const attentionItems: Array<{ tone: 'danger' | 'warning' | 'success'; label: string }> = [];
  if (eomForecast !== null && eomForecast > data.totalCost * 1.4) {
    attentionItems.push({ tone: 'danger', label: `Forecast ${formatCurrency(eomForecast)} — high end-of-month risk` });
  }
  if (mspSavings > 0) {
    attentionItems.push({ tone: 'success', label: `Maitsys CSP saves ${formatCurrency(mspSavings)}/mo (${(mspRate * 100).toFixed(1)}% off)` });
  }
  if (topService && data.totalCost > 0 && topService.cost / data.totalCost > 0.5) {
    attentionItems.push({ tone: 'warning', label: `${topService.name} is ${((topService.cost / data.totalCost) * 100).toFixed(0)}% of spend — concentration risk` });
  }
  if (attentionItems.length === 0) {
    attentionItems.push({ tone: 'success', label: 'All metrics within normal range' });
  }

  const serviceSlices = sortedServices.slice(0, 6).map((s, i) => ({
    label: s.name,
    value: s.cost,
    color: [props.chartColors.primary, props.chartColors.secondary, props.chartColors.tertiary, props.chartColors.axis][i % 4],
  }));

  return (
    <div>
      <section className="mv-panel" style={{ marginBottom: 16 }}>
        <div className="mv-panel-header"><h2 className="mv-panel-title">Executive Summary</h2></div>
        <div className="mv-row-3col">
          <div>
            <p className="mv-muted" style={{ marginBottom: 8, fontWeight: 500 }}>Cost at a glance</p>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="mv-muted">MTD spend</span><strong>{formatCurrency(data.totalCost)}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="mv-muted">EOM forecast</span><strong>{eomForecast !== null ? formatCurrency(eomForecast) : '—'}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="mv-muted">CSP savings</span><strong style={{ color: 'var(--mv-success)' }}>{mspSavings > 0 ? formatCurrency(mspSavings) : '—'}</strong></div>
            </div>
          </div>
          <div>
            <p className="mv-muted" style={{ marginBottom: 8, fontWeight: 500 }}>Attention items</p>
            <div style={{ display: 'grid', gap: 8 }}>
              {attentionItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span className={`mv-status mv-status--${item.tone}`} style={{ marginTop: 1 }}>●</span>
                  <p style={{ margin: 0, fontSize: 13 }}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mv-muted" style={{ marginBottom: 8, fontWeight: 500 }}>Top services</p>
            {sortedServices.length === 0 ? (
              <p className="mv-muted">No data — sync to populate</p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {sortedServices.slice(0, 4).map((svc, i) => (
                  <div key={svc.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: [props.chartColors.primary, props.chartColors.secondary, props.chartColors.tertiary, props.chartColors.axis][i % 4], flexShrink: 0 }} />
                    <Tooltip content={svc.name}><span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{svc.name}</span></Tooltip>
                    <strong>{formatCurrency(svc.cost)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mv-row-3col">
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">Service Cost Distribution</h2></div>
          <DonutChart title="Service cost distribution" totalLabel="Spend" data={serviceSlices} />
        </section>
        <section className="mv-panel" id="exec-csp-savings">
          <div className="mv-panel-header"><h2 className="mv-panel-title">Maitsys CSP Savings</h2></div>
          <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="mv-muted">CSP discount rate</span><strong>{(mspRate * 100).toFixed(1)}%</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="mv-muted">Monthly savings</span><strong style={{ color: 'var(--mv-success)' }}>{mspSavings > 0 ? formatCurrency(mspSavings) : '—'}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="mv-muted">Annual projection</span><strong style={{ color: 'var(--mv-success)' }}>{mspSavings > 0 ? formatCurrency(mspSavings * 12) : '—'}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="mv-muted">Based on MTD spend</span><strong>{formatCurrency(data.totalCost)}</strong></div>
          </div>
          <div className="mv-inline-error" style={{ borderColor: 'var(--mv-success)', background: 'color-mix(in srgb, var(--mv-success) 7%, transparent)', color: 'var(--mv-text)' }}>
            <strong style={{ color: 'var(--mv-success)' }}>Maitsys CSP pricing</strong>
            <p className="mv-muted" style={{ margin: '2px 0 0' }}>Gives you {(mspRate * 100).toFixed(1)}% off list price on all GCP services every month.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
