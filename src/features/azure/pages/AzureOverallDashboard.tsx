import { useState } from 'react';
import { CloudIcon, RefreshIcon, PlusIcon } from '../../../shared/ui/icons';
import { SpendTrendChart } from '../../../shared/ui/SpendTrendChart';
import { azureAccountSummaries, azureTopServicesAllAccounts, MOCK_AZURE_FULL } from '../../../demo/azure/mockAzureData';
import type { AzureAccountSummary } from '../model/azureTypes';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 60},${20 - ((v - min) / range) * 20}`).join(' ');
  return (
    <svg width="60" height="20" viewBox="0 0 60 20" aria-hidden style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke="var(--mv-primary)" strokeWidth="1.5" />
    </svg>
  );
}

function budgetTone(pct: number | null): 'danger' | 'warning' | 'success' | 'neutral' {
  if (pct === null) return 'neutral';
  if (pct >= 90) return 'danger';
  if (pct >= 70) return 'warning';
  return 'success';
}

interface AzureOverallDashboardProps {
  onSelectAccount: (accountId: string) => void;
  onManageAccounts: () => void;
}

/**
 * OverallDashboard, ported from the reference CCM app's
 * azure/pages/AzureOverallDashboard.jsx: aggregated cross-subscription
 * summary. "Tag Coverage" and "Status" columns are static placeholders in
 * the reference app itself (not a real backend field) — reproduced as-is
 * rather than inventing a fake data source for them.
 */
export function AzureOverallDashboard({ onSelectAccount, onManageAccounts }: AzureOverallDashboardProps) {
  const [refreshing, setRefreshing] = useState(false);
  const accounts: AzureAccountSummary[] = azureAccountSummaries();
  const topServices = azureTopServicesAllAccounts();
  const totalCost = accounts.reduce((sum, a) => sum + a.totalCost, 0);
  const todaySpend = accounts.reduce((sum, a) => sum + (a.todayCost ?? 0), 0);
  const trend = MOCK_AZURE_FULL.costs.dailyCosts.map((d) => ({ date: d.date, amount: d.cost }));

  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <div>
      <div className="mv-page-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="mv-avatar" style={{ background: '#0078d4', borderRadius: 10 }}><CloudIcon size={18} /></span>
          <div>
            <h1 className="mv-title" style={{ fontSize: 22 }}>Azure Accounts Overview</h1>
            <p className="mv-subtitle">Aggregated insights across {accounts.length} Azure subscription{accounts.length === 1 ? '' : 's'}.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="mv-secondary-button" onClick={refresh} disabled={refreshing}>
            <RefreshIcon size={16} style={{ marginRight: 6 }} />{refreshing ? 'Refreshing…' : 'Refresh Data'}
          </button>
          <button className="mv-primary-button" onClick={onManageAccounts}>
            <PlusIcon size={16} style={{ marginRight: 6 }} />Manage Accounts
          </button>
        </div>
      </div>

      <div className="mv-kpi-row-4">
        <article className="mv-kpi"><span className="mv-kpi-label">Total Spend · Month-to-Date</span><strong className="mv-kpi-value">{formatCurrency(totalCost)}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Today's Spend</span><strong className="mv-kpi-value">{todaySpend > 0 ? formatCurrency(todaySpend) : 'Syncing…'}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Active Accounts</span><strong className="mv-kpi-value">{accounts.length}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Provider</span><strong className="mv-kpi-value" style={{ color: '#0078d4' }}>Azure</strong></article>
      </div>

      <section className="mv-panel" style={{ marginBottom: 16 }}>
        <div className="mv-panel-header"><h2 className="mv-panel-title">Environments</h2></div>
        <div className="mv-table-wrap">
          <table className="mv-table">
            <thead>
              <tr><th>Subscription</th><th>Name</th><th className="mv-num">Current Spend</th><th>Budget Status</th><th>Tag Coverage</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="mv-code">{account.subscriptionId.slice(0, 8)}…{account.subscriptionId.slice(-4)}</td>
                  <td>{account.name}</td>
                  <td className="mv-num">{formatCurrency(account.totalCost)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkline values={account.sparkline} />
                      <span className={`mv-status mv-status--${budgetTone(account.budgetStatus?.pct ?? null)}`}>
                        {account.budgetStatus ? `${account.budgetStatus.pct}% used` : 'No budget'}
                      </span>
                    </div>
                  </td>
                  <td><span className="mv-status mv-status--neutral">N/A</span></td>
                  <td><span className="mv-status mv-status--success">Active</span></td>
                  <td><button className="mv-quiet-button" onClick={() => onSelectAccount(account.id)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mv-columns-16-8">
        <section className="mv-panel" aria-labelledby="azure-trend-title">
          <div className="mv-panel-header"><h2 id="azure-trend-title" className="mv-panel-title">Cost Trend</h2></div>
          <SpendTrendChart title="Azure daily cost trend" data={trend} />
        </section>
        <section className="mv-panel" aria-labelledby="azure-top-services-title">
          <div className="mv-panel-header"><h2 id="azure-top-services-title" className="mv-panel-title">Top Services — all subscriptions</h2></div>
          <div className="mv-service-tile-grid">
            {topServices.slice(0, 6).map((service) => (
              <div className="mv-service-tile" key={service.name}>
                <span className="mv-service-tile-badge">{service.name.replace('Microsoft.', '').slice(0, 2).toUpperCase()}</span>
                <span className="mv-service-tile-name">{service.name}</span>
                <strong>{formatCurrency(service.value)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
