import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudIcon, RefreshIcon, PlusIcon, ChevronRightIcon } from '../../../shared/ui/icons';
import { SpendTrendChart } from '../../../shared/ui/SpendTrendChart';
import { DonutChart } from '../../../shared/ui/DonutChart';
import { useMaveraTheme } from '../../../shared/theme/ThemeProvider';
import { chartColors } from '../../../shared/theme/tokens';
import { useBtpAccounts } from '../model/BtpAccountContext';
import { ServiceCategoryTable } from '../components/ServiceCategoryTable';
import { cloudSamplesRepository } from '../../../data-access';
import { NothingConnected, SampleDataBadge } from '../../workspace';
import { serviceCategoryOf } from '../model/btpDerivations';

function formatCurrency(value: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

/**
 * OverallDashboard, ported from the reference CCM app's
 * btp/pages/BtpOverallDashboard.jsx: simpler than the per-account cost
 * page — a plain accounts list (no budget-status/sparkline columns) plus a
 * 5-card KPI row oriented around account/service counts rather than
 * forecast/savings (those live only on the per-account BtpCostPage).
 */
export function BtpOverallDashboard() {
  const navigate = useNavigate();
  const { accounts } = useBtpAccounts();
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  const [refreshing, setRefreshing] = useState(false);
  const summaries = useMemo(() => cloudSamplesRepository.btp.summaries(accounts), [accounts]);
  const topServices = useMemo(() => cloudSamplesRepository.btp.topServices(accounts), [accounts]);
  const totalCost = summaries.reduce((sum, a) => sum + a.totalCost, 0);
  const avgPerAccount = accounts.length > 0 ? totalCost / accounts.length : 0;
  const topService = topServices[0];

  const serviceSlices = topServices.slice(0, 6).map((s, i) => ({
    label: s.name,
    value: s.cost,
    color: [colors.primary, colors.secondary, colors.tertiary, colors.axis][i % 4],
  }));

  const refresh = () => { setRefreshing(true); window.setTimeout(() => setRefreshing(false), 500); };

  return (
    <div>
      <div className="mv-page-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="mv-avatar" style={{ background: '#0070f2', borderRadius: '0.625rem' }}><CloudIcon size={18} /></span>
          <div>
            <h1 className="mv-title" style={{ fontSize: '1.375rem' }}>SAP BTP Overview</h1>
            <p className="mv-subtitle">{accounts.length} account{accounts.length === 1 ? '' : 's'} monitored. {accounts.some((a) => a.sample) && <SampleDataBadge />}</p>
          </div>
        </div>
        {accounts.length > 0 && (
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button className="mv-secondary-button" onClick={refresh} disabled={refreshing}><RefreshIcon size={16} style={{ marginRight: '0.375rem' }} />{refreshing ? 'Refreshing…' : 'Refresh Data'}</button>
            <button className="mv-primary-button" onClick={() => navigate('/btp/accounts')}><PlusIcon size={16} style={{ marginRight: '0.375rem' }} />Add Account</button>
          </div>
        )}
      </div>

      {accounts.length === 0 ? (
        <NothingConnected target="btp" heading="No SAP BTP accounts connected yet" explanation="Connect a global account and its consumption, services and subaccounts appear here after the first sync." actionLabel="Connect SAP BTP" />
      ) : (
        <>
      <div className="mv-kpi-row-5">
        <article className="mv-kpi"><span className="mv-kpi-label">Total Month-to-Date Spend</span><strong className="mv-kpi-value">{formatCurrency(totalCost)}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">BTP Accounts</span><strong className="mv-kpi-value">{accounts.length}</strong><span className="mv-muted">Active global accounts</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Top Service</span><strong className="mv-kpi-value" style={{ fontSize: '1.125rem' }}>{topService?.name ?? '—'}</strong>{topService && <span className="mv-muted">{formatCurrency(topService.cost)}</span>}</article>
        <article className="mv-kpi"><span className="mv-kpi-label">Avg per Account</span><strong className="mv-kpi-value">{formatCurrency(avgPerAccount)}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Total Services</span><strong className="mv-kpi-value">{topServices.length}</strong><span className="mv-muted">{topServices.length} services tracked</span></article>
      </div>

      <div className="mv-columns-16-8" style={{ marginBottom: '1rem' }}>
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">BTP Accounts</h2><button className="mv-quiet-button" onClick={() => navigate('/btp/accounts')}>Manage →</button></div>
          {accounts.length === 0 ? (
            <div className="mv-empty" style={{ margin: 0 }}>
              <h2>No BTP accounts added yet</h2>
              <button className="mv-primary-button" onClick={() => navigate('/btp/accounts')}>Add your first account</button>
            </div>
          ) : (
            <div className="mv-account-list">
              {accounts.map((account) => {
                const summary = summaries.find((s) => s.id === account.id);
                return (
                  <button key={account.id} type="button" className="mv-account-row" style={{ width: '100%', cursor: 'pointer' }} onClick={() => navigate(`/btp/account/${account.id}`)}>
                    <span className="mv-account-row-body">
                      <span className="mv-avatar" style={{ background: 'var(--mv-selected)', color: '#0070f2' }}><CloudIcon size={16} /></span>
                      <span className="mv-account-row-meta">
                        <strong>{account.name}</strong>
                        <span className="mv-muted">{account.region ?? 'eu10'} · {summary?.currency ?? 'EUR'} · Synced {summary?.snapshotTime ? new Date(summary.snapshotTime).toLocaleString() : 'never'}</span>
                      </span>
                    </span>
                    <span className="mv-account-row-actions" style={{ gap: '0.625rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <strong>{summary ? formatCurrency(summary.totalCost, summary.currency) : '—'}</strong>
                        <div className="mv-muted" style={{ fontSize: '0.6875rem' }}>Month-to-Date Spend</div>
                      </div>
                      <ChevronRightIcon size={16} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">Top Services</h2></div>
          <DonutChart title="Top services" totalLabel="Spend" data={serviceSlices} />
        </section>
      </div>

      <div className="mv-pair">
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">Services Breakdown ({topServices.length})</h2></div>
          <div className="mv-table-wrap">
            <table className="mv-table mv-table--stack">
              <thead><tr><th>#</th><th>Service Name</th><th className="mv-num">MTD Cost</th><th>Share</th></tr></thead>
              <tbody>
                {topServices.map((svc, i) => {
                  const pct = totalCost > 0 ? (svc.cost / totalCost) * 100 : 0;
                  return (
                    <tr key={svc.name}>
                      <td data-label="#" className="mv-muted">{i + 1}</td>
                      <td data-label="Service Name">{svc.name}</td>
                      <td data-label="MTD Cost" className="mv-num">{formatCurrency(svc.cost)}</td>
                      <td data-label="Share">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: '0.375rem', borderRadius: '62.4375rem', background: 'var(--mv-divider)', overflow: 'hidden', minWidth: '3.75rem' }}>
                            <div style={{ height: '100%', borderRadius: '62.4375rem', width: `${pct}%`, background: 'var(--mv-primary)' }} />
                          </div>
                          <span className="mv-muted">{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mv-panel" aria-labelledby="btp-category-title">
          <div className="mv-panel-header">
            <div>
              <h2 id="btp-category-title" className="mv-panel-title">Service Category Summary</h2>
              <p className="mv-muted">{topServices.length} services in {new Set(topServices.map((s) => serviceCategoryOf(s.name))).size} categories</p>
            </div>
          </div>
          <ServiceCategoryTable services={topServices} currency="EUR" />
        </section>
      </div>

      {accounts.length > 0 && (
        <section className="mv-panel" aria-labelledby="btp-trend-title">
          <div className="mv-panel-header"><h2 id="btp-trend-title" className="mv-panel-title">Cost Trend</h2></div>
          <SpendTrendChart title="Per-account spend trend" data={summaries.map((s) => ({ date: accounts.find((a) => a.id === s.id)?.name ?? s.id, amount: s.totalCost }))} />
        </section>
      )}
        </>
      )}
    </div>
  );
}
