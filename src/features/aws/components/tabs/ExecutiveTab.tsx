import { useState } from 'react';
import type { AwsCostTabProps } from '../../model/AwsCostTabProps';
import type { AiInsight } from '../../model/awsDerivations';
import { awsServiceCategoryOf, momPct } from '../../model/awsDerivations';
import { groupByCategory } from '../../../../shared/lib/costAnalysis';
import { ServiceCategorySummary } from '../../../../shared/ui/ServiceCategorySummary';
import { SpendTrendChart } from '../../../../shared/ui/SpendTrendChart';
import { ResourceInventoryByType } from '../ResourceInventoryByType';
import { TrendDownIcon } from '../../../../shared/ui/icons';
import { Tooltip } from '../../../../shared/ui/Tooltip';

type AttentionTone = 'danger' | 'warning' | 'success' | 'info';
interface AttentionItem {
  tone: AttentionTone;
  label: string;
}

/**
 * Executive tab — CEO / Leadership audience. Ported from the reference CCM
 * app's `aws/pages/DetailedDashboard.jsx`, the `activeTab === "executive"`
 * block (lines 3329-3797): the 5-tile KPI row, the "Financial Snapshot"
 * card + "Annual Cost Trend" chart, the "AI Executive Summary" panel,
 * "Top 5 Cost Drivers" and the "Attention Center" + Maitsys CSP savings
 * callout. Structure/CSS-class choices mirror Azure's already-built
 * `azure/tabs/ExecutiveTab.tsx`; only the KPI set and data fields are AWS's
 * own (5 KPI tiles here vs Azure's 4, CSP + optimization savings split out,
 * an extra "optimization savings available" Attention Center flag sourced
 * from `cspRecommendations`).
 *
 * Added from the reference's Executive view: the "Service Category Summary"
 * (services grouped by `awsServiceCategoryOf`, a category chart plus a
 * roll-up table that opens to its services, which also lists the small
 * line items such as AWS WAF, Tax, CodeBuild and AWS Budgets) and the
 * "Resource Inventory" by type with each type's share.
 *
 * `resources` and `cspRecommendations` are the org's current live state
 * (not month-scoped) per `AwsCostTabProps` — used as-is regardless of which
 * month `data` resolves to.
 *
 * The "Annual Cost Trend" chart reuses `SpendTrendChart` (an area chart)
 * rather than reproducing the reference's bar chart, per the established
 * pattern in this directory. `SpendTrendChart` doesn't expose a per-point
 * click hook, so the reference's "click a bar to jump to that month" isn't
 * wired here — the same simplification Azure's `ExecutiveTab.tsx` already
 * made for its own trend chart.
 */
export function ExecutiveTab(props: AwsCostTabProps & { aiInsights?: AiInsight[] }) {
  const { data, yearlyData, resources, cspRecommendations, mspRate, aiInsights = [] } = props;
  const [summaryOpen, setSummaryOpen] = useState(true);

  const forecastUsed = !!(data.forecast && data.forecast > 0);
  const amountPayable = data.forecast && data.forecast > 0 ? data.forecast : data.totalCost;

  const cspSavings = data.totalCost * mspRate;
  const optimizationSavings = cspRecommendations.reduce((sum, r) => sum + r.estimated_savings, 0);
  const totalSavings = cspSavings + optimizationSavings;
  const savingsPct = data.totalCost > 0 ? (totalSavings / data.totalCost) * 100 : 0;

  const usageLineItems = data.details.length;

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
  const categorySummary = groupByCategory(data.services, awsServiceCategoryOf);

  const attentionItems: AttentionItem[] = [];
  if (trendChange !== null && trendChange > 15) {
    attentionItems.push({ tone: 'danger', label: `Cost spike: +${trendChange}% vs last month` });
  }
  if (data.forecast !== null && data.forecast > data.totalCost * 1.4) {
    attentionItems.push({ tone: 'danger', label: `Forecast ${formatCurrency(data.forecast)} — high end-of-month risk` });
  }
  if (cspRecommendations.length > 0) {
    attentionItems.push({
      tone: 'info',
      label: `${formatCurrency(optimizationSavings)} in optimization savings available across ${cspRecommendations.length} recommendation${cspRecommendations.length === 1 ? '' : 's'}`,
    });
  }
  if (cspSavings > 0) {
    attentionItems.push({ tone: 'success', label: `Maitsys CSP saves ${formatCurrency(cspSavings)}/mo (${(mspRate * 100).toFixed(1)}% off)` });
  }
  if (topService && data.totalCost > 0 && topService.cost / data.totalCost > 0.5) {
    attentionItems.push({ tone: 'warning', label: `${topService.name} is ${((topService.cost / data.totalCost) * 100).toFixed(0)}% of spend — concentration risk` });
  }
  if (attentionItems.length === 0) {
    attentionItems.push({ tone: 'success', label: 'All metrics within normal range' });
  }

  return (
    <div>
      <div className="mv-kpi-row-5">
        <article className="mv-kpi">
          <span className="mv-kpi-label">Active Service Types</span>
          <strong className="mv-kpi-value">{data.services.length.toLocaleString()}</strong>
          <span className="mv-muted">{usageLineItems} usage line item{usageLineItems === 1 ? '' : 's'} across services</span>
        </article>
        <article className="mv-kpi">
          <span className="mv-kpi-label">Total Resources</span>
          <strong className="mv-kpi-value">{resources.total.toLocaleString()}</strong>
          <span className="mv-muted">across {resources.byType.length} resource types</span>
        </article>
        <article className="mv-kpi">
          <span className="mv-kpi-label">Amount Payable</span>
          <strong className="mv-kpi-value">{formatCurrency(amountPayable)}</strong>
          <span className="mv-muted">{forecastUsed ? 'EOM Forecast' : 'Current Month-to-Date'}</span>
        </article>
        <article className="mv-kpi">
          <span className="mv-kpi-label">Total Savings</span>
          <strong className="mv-kpi-value" style={{ color: 'var(--mv-success)' }}>{formatCurrency(totalSavings)}</strong>
          <span className="mv-muted">CSP + Optimization</span>
        </article>
        <article className="mv-kpi">
          <span className="mv-kpi-label">Savings %</span>
          <strong className="mv-kpi-value">{savingsPct.toFixed(1)}%</strong>
          <span className="mv-muted">of gross spend</span>
        </article>
      </div>

      <section className="mv-panel" id="exec-annual-trend" style={{ marginBottom: '1rem' }}>
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
            <strong>{formatCurrency(data.totalCost)}</strong>
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
        <SpendTrendChart title="Annual Cost Trend" data={trendData} />
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

      <div className="mv-row-3col" style={{ marginBottom: '1rem' }}>
        <section className="mv-panel" id="exec-top-services">
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
                      <td data-label="% of Total" className="mv-num">{data.totalCost > 0 ? `${((svc.cost / data.totalCost) * 100).toFixed(1)}%` : '0.0%'}</td>
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
                <p className="mv-muted" style={{ margin: '2px 0 0' }}>{(mspRate * 100).toFixed(1)}% pricing advantage on AWS spend</p>
              </div>
              <span className="mv-status mv-status--success">{(mspRate * 100).toFixed(0)}% off</span>
            </div>
          )}
        </section>
      </div>

      <div className="mv-detail-stack">
        <ResourceInventoryByType resources={resources} />
      </div>
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

function attentionToneLabel(tone: AttentionTone): string {
  return tone === 'danger' ? 'Alert' : tone === 'warning' ? 'Watch' : tone === 'info' ? 'Info' : 'Good';
}
