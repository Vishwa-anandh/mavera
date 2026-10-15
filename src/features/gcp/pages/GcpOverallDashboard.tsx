import { useNavigate } from 'react-router-dom';
import { CloudIcon, SettingsIcon } from '../../../shared/ui/icons';
import { SpendTrendChart } from '../../../shared/ui/SpendTrendChart';
import { DonutChart } from '../../../shared/ui/DonutChart';
import { useGcpAccounts } from '../model/GcpAccountContext';
import { gcpAccountSummaries, gcpTopServices } from '../../../demo/gcp/mockGcpData';
import { useMaveraTheme } from '../../../shared/theme/ThemeProvider';
import { chartColors } from '../../../shared/theme/tokens';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

/**
 * OverallDashboard, ported from the reference CCM app's
 * gcp/pages/GcpOverallDashboard.jsx: simpler than Azure/AWS's equivalent —
 * a plain "Projects" list (no budget-status/sparkline/tag-coverage columns,
 * which the reference genuinely doesn't have here) plus a KPI row of
 * Total Spend / Projects / Top Service / Top Service Cost.
 */
export function GcpOverallDashboard() {
  const navigate = useNavigate();
  const { accounts } = useGcpAccounts();
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  const summaries = gcpAccountSummaries();
  const topServices = gcpTopServices();
  const totalCost = summaries.reduce((sum, a) => sum + a.totalCost, 0);
  const topService = topServices[0];

  const serviceSlices = topServices.slice(0, 6).map((s, i) => ({
    label: s.name,
    value: s.cost,
    color: [colors.primary, colors.secondary, colors.tertiary, colors.axis][i % 4],
  }));

  if (accounts.length === 0) {
    return (
      <div>
        <div className="mv-empty">
          <div className="mv-empty-icon" aria-hidden><CloudIcon size={28} /></div>
          <h2>No GCP projects connected</h2>
          <p>Connect a Google Cloud project using a service account to start monitoring your GCP costs.</p>
          <button className="mv-primary-button" onClick={() => navigate('/gcp/accounts')}>Connect GCP Project</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mv-page-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="mv-avatar" style={{ background: '#3b82f6', borderRadius: '0.625rem' }}><CloudIcon size={18} /></span>
          <div>
            <h1 className="mv-title" style={{ fontSize: '1.375rem' }}>GCP Overview</h1>
            <p className="mv-subtitle">{accounts.length} project{accounts.length === 1 ? '' : 's'} connected.</p>
          </div>
        </div>
        <button className="mv-secondary-button" onClick={() => navigate('/gcp/accounts')}>
          <SettingsIcon size={16} style={{ marginRight: '0.375rem' }} />Manage
        </button>
      </div>

      <div className="mv-kpi-row-4">
        <article className="mv-kpi"><span className="mv-kpi-label">Total Spend (MTD)</span><strong className="mv-kpi-value">{formatCurrency(totalCost)}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Projects</span><strong className="mv-kpi-value">{accounts.length}</strong><span className="mv-muted">connected</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Top Service</span><strong className="mv-kpi-value" style={{ fontSize: '1.25rem' }}>{topService?.name ?? '—'}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Top Service Cost</span><strong className="mv-kpi-value">{topService ? formatCurrency(topService.cost) : '—'}</strong></article>
      </div>

      <div className="mv-columns-16-8" style={{ marginBottom: '1rem' }}>
        <section className="mv-panel" aria-labelledby="gcp-spend-title">
          <div className="mv-panel-header"><h2 id="gcp-spend-title" className="mv-panel-title">Spend by Project</h2></div>
          <SpendTrendChart title="Spend by project" data={summaries.map((s) => ({ date: s.name, amount: s.totalCost }))} />
        </section>
        <section className="mv-panel" aria-labelledby="gcp-services-title">
          <div className="mv-panel-header"><h2 id="gcp-services-title" className="mv-panel-title">Top Services</h2></div>
          <DonutChart title="Top services" totalLabel="Spend" data={serviceSlices} />
        </section>
      </div>

      <section className="mv-panel">
        <div className="mv-panel-header"><h2 className="mv-panel-title">Projects</h2><span className="mv-muted">{accounts.length} total</span></div>
        <div className="mv-account-list">
          {accounts.map((account) => {
            const summary = summaries.find((s) => s.id === account.id);
            return (
              <button key={account.id} type="button" className="mv-account-row" style={{ width: '100%', cursor: 'pointer' }} onClick={() => navigate(`/gcp/account/${account.id}`)}>
                <span className="mv-account-row-body">
                  <span className="mv-avatar" style={{ background: 'var(--mv-selected)', color: '#3b82f6' }}><CloudIcon size={16} /></span>
                  <span className="mv-account-row-meta">
                    <strong>{account.name}</strong>
                    <span className="mv-muted">{summary?.snapshotTime ? `Synced ${new Date(summary.snapshotTime).toLocaleString()}` : 'Not synced yet'}</span>
                  </span>
                </span>
                <span className="mv-account-row-actions">
                  <strong>{summary ? formatCurrency(summary.totalCost) : '—'}</strong>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
