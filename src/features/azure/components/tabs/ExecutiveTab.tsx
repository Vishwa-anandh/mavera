import { useState } from 'react';
import type { AzureCostTabProps } from '../../model/AzureCostTabProps';
import type { AiInsight } from '../../model/azureDerivations';
import { azureServiceCategoryOf, momPct } from '../../model/azureDerivations';
import { groupByCategory } from '../../../../shared/lib/costAnalysis';
import { ServiceBreakdownList } from '../../../../shared/ui/ServiceBreakdownList';
import { ServiceCategorySummary } from '../../../../shared/ui/ServiceCategorySummary';
import { SpendTrendChart } from '../../../../shared/ui/SpendTrendChart';
import { ResourceCostTable } from '../ResourceCostTable';
import { TrendDownIcon } from '../../../../shared/ui/icons';
import { Tooltip } from '../../../../shared/ui/Tooltip';

/**
 * Executive tab — CEO / Leadership audience. Ported from the reference CCM
 * app's `azure/pages/AzureCostPage.jsx`, the `activeTab === "executive"` IIFE
 * block (headline KPI row, annual "Financial Snapshot" + MoM trend chart,
 * the "AI Executive Summary" panel, "Top 5 Cost Drivers" and the
 * "Attention Center" + Maitsys CSP savings callout).
 *
 * The headline figures (spend, forecast, daily pace, CSP saving, service and resource counts) are one
 * shared summary on the account page, above every view, so this view has no second KPI strip.
 *
 * The reference's resource inventory by type stays on `TechnicalTab.tsx`. This view adds the per-service
 * "Service Breakdown" (the top six services, expandable to every meter, with the CSP saving), plus the reference's "Service Category Summary" (services grouped by
 * `azureServiceCategoryOf`, a category chart plus a roll-up table that opens to its services) and the
 * resource table with its CSP saving, which shows the top few rows and expands with "Show all N resources".
 *
 * `data.topResources` / `data.resources` are zeroed for historical months;
 * this tab only reads `data.services` / `data.totalCost` / `data.forecast`
 * (safe for every month); the resource table is guarded.
 *
 * The MoM trend (Financial Snapshot tiles, chart, Attention Center's spike
 * flag) is anchored to the real latest/previous entries in `yearlyData`
 * (last two array entries) rather than to whichever month the page's month
 * switcher has selected — this matches the reference exactly, whose
 * `execPrevTotal` is always computed from `nowYear`/`nowMonth` (today's real
 * calendar month), never from `selectedMonth`.
 */
export function ExecutiveTab(props: AzureCostTabProps & { aiInsights?: AiInsight[] }) {
  const { data, yearlyData, isCurrentMonth, mspRate, aiInsights = [] } = props;
  const [summaryOpen, setSummaryOpen] = useState(true);

  const execTotal = data.totalCost;
  const execForecast = isCurrentMonth ? data.forecast : 0;
  const cspSavings = execTotal * mspRate;

  const currentEntry = yearlyData[yearlyData.length - 1];
  const previousEntry = yearlyData[yearlyData.length - 2];
  const trendChange = currentEntry && previousEntry ? momPct(currentEntry.totalCost, previousEntry.totalCost) : null;

  const yearlyTotal = yearlyData.reduce((sum, m) => sum + m.totalCost, 0);
  const yearlyAvg = yearlyData.length > 0 ? yearlyTotal / yearlyData.length : 0;
  const ytdSavings = cspSavings * (currentEntry?.month ?? 1);

  const trendData = yearlyData.map((m) => ({ date: monthLabel(m.year, m.month), amount: m.totalCost }));

  const topServices = [...data.services].sort((a, b) => b.cost - a.cost);
  const topDrivers = topServices.slice(0, 5);
  const topService = topServices[0];
  const categorySummary = groupByCategory(data.services, azureServiceCategoryOf);

  const attentionItems: Array<{ tone: 'danger' | 'warning' | 'success'; label: string }> = [];
  if (trendChange !== null && trendChange > 15) {
    attentionItems.push({ tone: 'danger', label: `Cost spike: +${trendChange}% vs last month` });
  }
  if (execTotal > 0 && execForecast > execTotal * 1.4) {
    attentionItems.push({ tone: 'danger', label: `Forecast ${formatCurrency(execForecast)} — high end-of-month risk` });
  }
  if (cspSavings > 0) {
    attentionItems.push({ tone: 'success', label: `Maitsys CSP saves ${formatCurrency(cspSavings)}/mo (${(mspRate * 100).toFixed(0)}% off)` });
  }
  if (topService && execTotal > 0 && topService.cost / execTotal > 0.5) {
    attentionItems.push({ tone: 'warning', label: `${topService.name} is ${((topService.cost / execTotal) * 100).toFixed(0)}% of spend — concentration risk` });
  }
  if (attentionItems.length === 0) {
    attentionItems.push({ tone: 'success', label: 'All metrics within normal range' });
  }

  return (
    <div>
      <section className="mv-panel" style={{ marginBottom: '1rem' }}>
        <div className="mv-panel-header">
          <h2 className="mv-panel-title">Financial Snapshot</h2>
        </div>
        <div className="mv-service-tile-grid mv-service-tile-grid--5" style={{ marginBottom: '1.25rem' }}>
          <div className="mv-service-tile">
            <span className="mv-service-tile-name">Last Month</span>
            <strong>{previousEntry ? formatCurrency(previousEntry.totalCost) : '—'}</strong>
            <span className="mv-muted">{previousEntry ? monthLabel(previousEntry.year, previousEntry.month) : '—'}</span>
          </div>
          <div className="mv-service-tile">
            <span className="mv-service-tile-name">Current Month</span>
            <strong>{formatCurrency(execTotal)}</strong>
            <span className="mv-muted">Month-to-Date</span>
          </div>
          <div className="mv-service-tile">
            <span className="mv-service-tile-name">Full Year Total</span>
            <strong>{yearlyTotal > 0 ? formatCurrency(yearlyTotal) : '—'}</strong>
            <span className="mv-muted">{currentEntry ? currentEntry.year : '—'}</span>
          </div>
          <div className="mv-service-tile">
            <span className="mv-service-tile-name">Projected Annual</span>
            <strong>{yearlyAvg > 0 ? formatCurrency(yearlyAvg * 12) : '—'}</strong>
            <span className="mv-muted">Avg × 12</span>
          </div>
          <div className="mv-service-tile">
            <span className="mv-service-tile-name">YTD Savings</span>
            <strong>{formatCurrency(ytdSavings)}</strong>
            <span className="mv-muted">Est. cumulative</span>
          </div>
        </div>
        <SpendTrendChart title="Azure monthly spend trend" data={trendData} />
      </section>

      {aiInsights.length > 0 && (
        <section className="mv-panel" style={{ marginBottom: '1rem' }}>
          <div className="mv-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <h2 className="mv-panel-title">AI Executive Summary</h2>
              <span className="mv-status mv-status--info">{aiInsights.length} insights</span>
            </div>
            <button type="button" className="mv-quiet-button" onClick={() => setSummaryOpen((v) => !v)}>
              {summaryOpen ? 'Hide' : 'Show'}
            </button>
          </div>
          {summaryOpen && (
            <div style={{ display: 'grid', gap: '0.625rem', gridTemplateColumns: 'repeat(auto-fit, minmax(16.25rem, 1fr))' }}>
              {aiInsights.map((insight, i) => (
                <div key={i} className={`mv-inline-error mv-ai-insight mv-ai-insight--${insight.type}`}>
                  <span className={`mv-status mv-status--${insight.type}`}>{insightTypeLabel(insight.type)}</span>
                  <p style={{ margin: '0.375rem 0 0', fontWeight: 500, color: 'var(--mv-text)' }}>{insight.title}</p>
                  <p className="mv-muted" style={{ margin: '2px 0 0' }}>{insight.detail}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="mv-detail-stack">
        <ServiceCategorySummary summary={categorySummary} />
      </div>

      {data.details.length > 0 && (
        <div className="mv-detail-stack" id="azure-service-breakdown-summary">
          <ServiceBreakdownList lines={data.details.map((line) => ({ service: line.service, usageType: line.meter, cost: line.cost }))} cspRate={mspRate} format={formatCurrency} limit={6} />
        </div>
      )}

      <div className="mv-row-3col" style={{ marginBottom: '1rem' }}>
        <section className="mv-panel">
          <div className="mv-panel-header">
            <h2 className="mv-panel-title">Top 5 Cost Drivers</h2>
          </div>
          {topDrivers.length === 0 ? (
            <p className="mv-muted">No service data available.</p>
          ) : (
            <div className="mv-table-wrap">
              <table className="mv-table mv-table--stack">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Service</th>
                    <th className="mv-num">Monthly Cost</th>
                    <th className="mv-num">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {topDrivers.map((svc, i) => (
                    <tr key={svc.name}>
                      <td data-label="#" className="mv-muted">{i + 1}</td>
                      <Tooltip content={svc.name}><td data-label="Service" className="mv-stack-title">{svc.name}</td></Tooltip>
                      <td data-label="Monthly Cost" className="mv-num">{formatCurrency(svc.cost)}</td>
                      <td data-label="% of Total" className="mv-num">{execTotal > 0 ? `${((svc.cost / execTotal) * 100).toFixed(1)}%` : '0.0%'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mv-panel">
          <div className="mv-panel-header">
            <h2 className="mv-panel-title">Attention Center</h2>
          </div>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {attentionItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', padding: '0.75rem', border: '1px solid var(--mv-divider)', borderRadius: '0.5rem' }}>
                <span className={`mv-status mv-status--${item.tone}`}>{attentionToneLabel(item.tone)}</span>
                <p style={{ margin: 0, fontSize: '0.8125rem' }}>{item.label}</p>
              </div>
            ))}
          </div>
          {cspSavings > 0 && (
            <div
              className="mv-inline-error"
              style={{
                marginTop: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                borderColor: 'var(--mv-success)',
                background: 'color-mix(in srgb, var(--mv-success) 7%, transparent)',
                color: 'var(--mv-text)',
              }}
            >
              <TrendDownIcon size={18} style={{ color: 'var(--mv-success)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ color: 'var(--mv-success)' }}>Maitsys CSP — {formatCurrency(cspSavings)}/mo saved</strong>
                <p className="mv-muted" style={{ margin: '2px 0 0' }}>{(mspRate * 100).toFixed(1)}% pricing advantage on Azure spend</p>
              </div>
              <span className="mv-status mv-status--success">{(mspRate * 100).toFixed(0)}% off</span>
            </div>
          )}
        </section>
      </div>

      <section className="mv-panel mv-detail-stack">
        <div className="mv-panel-header">
          <div>
            <h2 className="mv-panel-title">Resources by Cost</h2>
            <p className="mv-muted mv-section-sub">Every resource in the subscription, most expensive first, with its Maitsys CSP saving.</p>
          </div>
        </div>
        {isCurrentMonth ? (
          <ResourceCostTable resources={data.resources.allResources} mspRate={mspRate} />
        ) : (
          <div className="mv-notice">Resource-level detail isn't available for historical months. Switch to Month-to-Date to see it.</div>
        )}
      </section>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthLabel(year: number, month: number): string {
  return `${MONTH_ABBR[month - 1] ?? month} ${year}`;
}

function insightTypeLabel(type: AiInsight['type']): string {
  return type === 'warning' ? 'Warning' : type === 'success' ? 'Good' : 'Info';
}

function attentionToneLabel(tone: 'danger' | 'warning' | 'success'): string {
  return tone === 'danger' ? 'Alert' : tone === 'warning' ? 'Watch' : 'Good';
}
