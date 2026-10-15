import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMaveraTheme } from '../../../shared/theme/ThemeProvider';
import { chartColors } from '../../../shared/theme/tokens';
import { ChevronLeftIcon, RefreshIcon, SparkleIcon } from '../../../shared/ui/icons';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { useGcpAccounts } from '../model/GcpAccountContext';
import { MOCK_GCP_COSTS } from '../../../demo/gcp/mockGcpData';
import { buildAiInsights } from '../model/gcpDerivations';
import type { GcpCostTabProps } from '../model/GcpCostTabProps';
import { ExecutiveTab } from '../components/tabs/ExecutiveTab';
import { OperationsTab } from '../components/tabs/OperationsTab';
import { TechnicalTab } from '../components/tabs/TechnicalTab';

/** GCP's own documented default CSP discount rate (see the reference's
 * useMspRates DEFAULTS: gcp: 0.02) — lower than Azure's 7% and AWS's 3.5%. */
const GCP_MSP_RATE = 0.02;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

type TabKey = 'executive' | 'operations' | 'technical';
const TABS: Array<{ key: TabKey; label: string; sub: string }> = [
  { key: 'executive', label: 'Executive', sub: 'CEO / Leadership' },
  { key: 'operations', label: 'Operations', sub: 'Manager / Dept. Head' },
  { key: 'technical', label: 'Technical', sub: 'Engineer / In-depth' },
];

function useOutsideClose(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open, onClose]);
  return ref;
}

/**
 * Per-account GCP cost page. Notably simpler than Azure/AWS's equivalent —
 * confirmed via research that the reference has no account switcher, no
 * month picker and no yearly history on this page at all (its
 * `getGcpYearly` endpoint exists but this particular page never calls
 * it) — so this shell omits those controls rather than inventing them.
 */
export function GcpCostPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  const { getAccount } = useGcpAccounts();
  const account = getAccount(accountId ?? '');

  const [activeTab, setActiveTab] = useState<TabKey>('executive');
  const [syncing, setSyncing] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const aiRef = useOutsideClose(aiOpen, () => setAiOpen(false));

  if (!account) {
    return (
      <div>
        <div className="mv-empty">
          <h2>Project not found</h2>
          <p>This GCP project isn't in your connected accounts.</p>
          <button className="mv-primary-button" onClick={() => navigate('/gcp')}>Back to GCP</button>
        </div>
      </div>
    );
  }

  const data = MOCK_GCP_COSTS;
  const hasData = data.dailyCosts.length > 0 || data.services.length > 0;
  const dailyAvg = data.dailyCosts.length > 0 ? data.totalCost / data.dailyCosts.length : 0;
  const eomForecast = data.forecastData[0]?.projected_cost ?? null;
  const topService = [...data.services].sort((a, b) => b.cost - a.cost)[0];
  const mspSavings = data.totalCost * GCP_MSP_RATE;

  const aiInsights = buildAiInsights(data, GCP_MSP_RATE);

  const sync = () => { setSyncing(true); window.setTimeout(() => setSyncing(false), 700); };

  const tabProps: GcpCostTabProps = {
    account,
    data,
    mspRate: GCP_MSP_RATE,
    chartColors: colors,
  };

  return (
    <div>

      <div className="mv-cost-header">
        <div className="mv-cost-header-title">
          <button className="mv-icon-button" aria-label="Back to GCP overview" onClick={() => navigate('/gcp')}><ChevronLeftIcon size={20} /></button>
          <span className="mv-status mv-status--info">GCP</span>
          <Tooltip content={account.name}><h1 className="mv-title" style={{ fontSize: '1.25rem' }}>{account.name}</h1></Tooltip>
        </div>
        <div className="mv-cost-header-controls">
          <div style={{ position: 'relative' }} ref={aiRef}>
            <button className="mv-secondary-button" onClick={() => setAiOpen((v) => !v)} aria-haspopup="menu" aria-expanded={aiOpen}><SparkleIcon size={15} style={{ marginRight: '0.375rem' }} />AI Insights</button>
            {aiOpen && (
              <div className="mv-nav-dropdown" style={{ right: 0, left: 'auto', width: '21.25rem', padding: '0.875rem' }}>
                <p className="mv-panel-title" style={{ marginBottom: '0.625rem' }}>AI Cost Insights</p>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {aiInsights.length === 0 ? (
                    <p className="mv-muted">Not enough data for insights yet.</p>
                  ) : aiInsights.map((insight, i) => (
                    <div key={i} className={`mv-inline-error mv-ai-insight mv-ai-insight--${insight.type}`}>
                      <strong>{insight.title}</strong>
                      <p style={{ margin: '2px 0 0' }}>{insight.detail}</p>
                    </div>
                  ))}
                </div>
                <p className="mv-muted" style={{ marginTop: '0.625rem' }}>Based on current month-to-date data · Auto-generated</p>
              </div>
            )}
          </div>
          <button className="mv-primary-button" onClick={sync} disabled={syncing}><RefreshIcon size={16} style={{ marginRight: '0.375rem' }} />{syncing ? 'Syncing…' : 'Sync'}</button>
        </div>
      </div>

      <nav className="mv-cost-tabs" aria-label="Cost view">
        {TABS.map((tab) => (
          <button key={tab.key} className={`mv-cost-tab${activeTab === tab.key ? ' is-active' : ''}`} onClick={() => setActiveTab(tab.key)} aria-current={activeTab === tab.key ? 'page' : undefined}>
            <span>{tab.label}</span>
            <span className="mv-muted">{tab.sub}</span>
          </button>
        ))}
      </nav>

      <div className="mv-kpi-row-5">
        <article className="mv-kpi"><span className="mv-kpi-label">Month-to-Date Spend</span><strong className="mv-kpi-value">{formatCurrency(data.totalCost)}</strong><span className="mv-muted">Total GCP cost this month</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">EOM Forecast</span><strong className="mv-kpi-value">{eomForecast !== null ? formatCurrency(eomForecast) : '—'}</strong><span className="mv-muted">End-of-month projection</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Daily Average</span><strong className="mv-kpi-value">{formatCurrency(dailyAvg)}</strong><span className="mv-muted">Avg per day (MTD)</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Top Service</span><strong className="mv-kpi-value" style={{ fontSize: '1.25rem' }}>{topService?.name ?? 'N/A'}</strong>{topService && <span className="mv-muted">{formatCurrency(topService.cost)}</span>}</article>
        <article className="mv-kpi"><span className="mv-kpi-label">Maitsys CSP Savings</span><strong className="mv-kpi-value" style={{ color: 'var(--mv-success)' }}>{mspSavings > 0 ? formatCurrency(mspSavings) : '—'}</strong><span className="mv-muted">{(GCP_MSP_RATE * 100).toFixed(1)}% MSP pricing advantage</span></article>
      </div>

      {!hasData ? (
        <div className="mv-empty"><h2>No data available yet.</h2><p>Cost data will appear once this project syncs.</p></div>
      ) : (
        <>
          {activeTab === 'executive' && <ExecutiveTab {...tabProps} aiInsights={aiInsights} />}
          {activeTab === 'operations' && <OperationsTab {...tabProps} />}
          {activeTab === 'technical' && <TechnicalTab {...tabProps} />}
        </>
      )}
    </div>
  );
}
