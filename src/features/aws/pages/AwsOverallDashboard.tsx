import { ClickableRow, RowChevronCell, RowOpenButton } from '../../../shared/ui/ClickableRow';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudIcon, RefreshIcon, PlusIcon } from '../../../shared/ui/icons';
import { SpendTrendChart } from '../../../shared/ui/SpendTrendChart';
import { useAwsAccounts } from '../model/AwsAccountContext';
import { cloudSamplesRepository } from '../../../data-access';
import { NothingConnected, SampleDataBadge } from '../../workspace';
import type { AwsAccountSummary } from '../model/awsTypes';
import { PageTourButton } from '../../../shared/ui/PageTourButton';

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
      <polyline points={points} fill="none" stroke="#f97316" strokeWidth="1.5" />
    </svg>
  );
}

function budgetTone(pct: number | null): 'danger' | 'warning' | 'success' | 'neutral' {
  if (pct === null) return 'neutral';
  if (pct >= 90) return 'danger';
  if (pct >= 70) return 'warning';
  return 'success';
}

/**
 * OverallDashboard, ported from the reference CCM app's
 * aws/pages/OverallDashboard.jsx: aggregated cross-account summary. "Tag
 * Coverage" and "Status" columns are static placeholders in the reference
 * app itself (not a real backend field) — reproduced as-is rather than
 * inventing a fake data source for them. AWS uses real nested routes (see
 * AwsRoot.tsx), so navigation goes through `useNavigate` instead of
 * callback props.
 */
export function AwsOverallDashboard() {
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const { accounts: awsAccounts } = useAwsAccounts();
  const summaries: AwsAccountSummary[] = useMemo(() => cloudSamplesRepository.aws.summaries(awsAccounts), [awsAccounts]);
  const accounts = awsAccounts.map((account) => ({ account, summary: summaries.find((s) => s.id === account.id) }));
  const topServices = useMemo(() => cloudSamplesRepository.aws.topServices(awsAccounts), [awsAccounts]);
  const hasSample = awsAccounts.some((a) => a.sample);
  const totalCost = summaries.reduce((sum, a) => sum + a.totalCost, 0);
  const todaySpend = summaries.reduce((sum, a) => sum + (a.todayCost ?? 0), 0);
  const trend = summaries[0]?.sparkline.map((cost, i) => ({ date: `Day ${i + 1}`, amount: cost })) ?? [];

  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <div>
      <div className="mv-page-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="mv-avatar" style={{ background: '#f97316', borderRadius: '0.625rem' }}><CloudIcon size={18} /></span>
          <div>
            <h1 className="mv-title" style={{ fontSize: '1.375rem' }}>AWS Accounts Overview</h1>
            <p className="mv-subtitle">{accounts.length === 0 ? 'Connect an AWS account to see its cost here.' : <>Aggregated insights across {accounts.length} AWS environment{accounts.length === 1 ? '' : 's'}. {hasSample && <SampleDataBadge />}</>}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          {accounts.length > 0 && (<>
            <button className="mv-secondary-button" onClick={refresh} disabled={refreshing}>
              <RefreshIcon size={16} style={{ marginRight: '0.375rem' }} />{refreshing ? 'Refreshing…' : 'Refresh Data'}
            </button>
            <button className="mv-primary-button" onClick={() => navigate('/aws/accounts')}>
              <PlusIcon size={16} style={{ marginRight: '0.375rem' }} />Manage Accounts
            </button>
          </>)}
          <PageTourButton />
        </div>
      </div>

      {accounts.length === 0 ? (
        <NothingConnected target="aws" heading="No AWS accounts connected yet" explanation="Connect an account and its spend, services and budgets appear here within minutes." actionLabel="Connect AWS" />
      ) : (
        <>
      <div className="mv-kpi-row-4">
        <article className="mv-kpi"><span className="mv-kpi-label">Total Spend · Month-to-Date</span><strong className="mv-kpi-value">{formatCurrency(totalCost)}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Today's Spend</span><strong className="mv-kpi-value">{todaySpend > 0 ? formatCurrency(todaySpend) : 'Syncing…'}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Active Accounts</span><strong className="mv-kpi-value">{accounts.length}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Provider</span><strong className="mv-kpi-value" style={{ color: '#f97316' }}>AWS</strong></article>
      </div>

      <section className="mv-panel" style={{ marginBottom: '1rem' }}>
        <div className="mv-panel-header"><h2 className="mv-panel-title">Environments</h2></div>
        <div className="mv-table-wrap">
          <table className="mv-table mv-table--stack">
            <thead>
              <tr><th>Account ID</th><th>Name</th><th>Region</th><th className="mv-num">Current Spend</th><th>Budget Status</th><th>Tag Coverage</th><th>Status</th><th className="mv-row-chevron"><span className="mv-sr-only">Open</span></th></tr>
            </thead>
            <tbody>
              {accounts.map(({ account, summary }) => (
                <ClickableRow key={account.id} onOpen={() => navigate(`/aws/account/${account.id}`)}>
                  <td data-label="Account ID" className="mv-code">···· {account.id.slice(-4)}</td>
                  <td data-label="Name"><RowOpenButton onOpen={() => navigate(`/aws/account/${account.id}`)}>{account.name}</RowOpenButton></td>
                  <td data-label="Region">{account.region}</td>
                  <td data-label="Current Spend" className="mv-num">{summary ? formatCurrency(summary.totalCost) : '—'}</td>
                  <td data-label="Budget Status">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Sparkline values={summary?.sparkline ?? []} />
                      <span className={`mv-status mv-status--${budgetTone(summary?.budgetStatus?.pct ?? null)}`}>
                        {summary?.budgetStatus ? `${summary.budgetStatus.pct}% used` : 'No budget'}
                      </span>
                    </div>
                  </td>
                  <td data-label="Tag Coverage"><span className="mv-status mv-status--neutral">N/A</span></td>
                  <td data-label="Status"><span className="mv-status mv-status--success">Active</span></td>
                  <RowChevronCell />
                </ClickableRow>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mv-columns-16-8">
        <section className="mv-panel" aria-labelledby="aws-trend-title">
          <div className="mv-panel-header"><h2 id="aws-trend-title" className="mv-panel-title">Cost Trend</h2></div>
          <SpendTrendChart title="AWS daily cost trend" data={trend} />
        </section>
        <section className="mv-panel" aria-labelledby="aws-top-services-title">
          <div className="mv-panel-header"><h2 id="aws-top-services-title" className="mv-panel-title">Top Services — all accounts</h2></div>
          <div className="mv-service-tile-grid">
            {topServices.slice(0, 6).map((service) => (
              <div className="mv-service-tile" key={service.name}>
                <span className="mv-service-tile-badge">{service.name.replace(/^Amazon\s+|^AWS\s+/i, '').slice(0, 2).replace(/^./, (c) => c.toUpperCase()).replace(/^(.)(.)/, (_, a, b) => a + b.toLowerCase())}</span>
                <span className="mv-service-tile-name">{service.name}</span>
                <strong>{formatCurrency(service.value)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
        </>
      )}
    </div>
  );
}
