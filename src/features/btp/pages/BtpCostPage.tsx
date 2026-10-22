import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMaveraTheme } from '../../../shared/theme/ThemeProvider';
import { chartColors } from '../../../shared/theme/tokens';
import { ChevronLeftIcon, RefreshIcon, SparkleIcon } from '../../../shared/ui/icons';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { CostViewTabs } from '../../../shared/ui/CostViewTabs';
import { costViewPanelProps, useCostView } from '../../../shared/lib/useCostView';
import { useBtpAccounts } from '../model/BtpAccountContext';
import { cloudSamplesRepository } from '../../../data-access';
import { SampleDataBadge } from '../../workspace';
import { buildAiInsights, directoriesWithCosts, momPct } from '../model/btpDerivations';
import type { BtpCostTabProps } from '../model/BtpCostTabProps';
import { ExecutiveTab } from '../components/tabs/ExecutiveTab';
import { OperationsTab } from '../components/tabs/OperationsTab';
import { HierarchyTab } from '../components/tabs/HierarchyTab';
import { TechnicalTab } from '../components/tabs/TechnicalTab';
import { PageTourButton } from '../../../shared/ui/PageTourButton';
import { useRememberLastViewedAccount } from '../../../shared/lib/lastViewedAccount';

/** BTP's own documented default CSP discount rate (see the reference's
 * useMspRates DEFAULTS: btp: 0.02) — same as GCP's, lower than Azure's 7%
 * and AWS's 3.5%. */
const BTP_MSP_RATE = 0.02;

function formatCurrency(value: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}


const COST_VIEWS = ['executive', 'operations', 'hierarchy', 'technical'] as const;

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
 * Per-account BTP cost page. Ported from the reference CCM app's
 * BtpCostPage.jsx shell: no month picker or account switcher (confirmed
 * absent via research — BTP's `data` is always the current live
 * snapshot), a 4-card KPI row whose 3rd card dynamically swaps between
 * "Directories" and "Environments" depending on whether CIS_Central is
 * configured, and 4 tabs (Azure/AWS/GCP only have 3) — the extra
 * "Hierarchy" tab is BTP's directory/subaccount drill-down, its single
 * biggest structural difference from the other three providers.
 */
export function BtpCostPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  const { getAccount } = useBtpAccounts();
  const account = getAccount(accountId ?? '');
  // The account's cost data: its own fixture, or the provider's sample dataset under its name.
  const data = useMemo(() => (account ? cloudSamplesRepository.btp.costs(account) : null), [account]);
  const yearly = useMemo(() => cloudSamplesRepository.btp.yearly(), []);

  const [activeTab, setActiveTab] = useCostView('btp', accountId, COST_VIEWS);
  useRememberLastViewedAccount('btp', account);
  const [syncing, setSyncing] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const aiRef = useOutsideClose(aiOpen, () => setAiOpen(false));

  if (!account || !data) {
    return (
      <div>
        <div className="mv-empty">
          <h2>Account not found</h2>
          <p>This BTP account isn't in your connected accounts.</p>
          <button className="mv-primary-button" onClick={() => navigate('/btp')}>Back to BTP</button>
        </div>
      </div>
    );
  }

  const currency = data.currency;

  const currentEntry = yearly[yearly.length - 1];
  const prevEntry = yearly[yearly.length - 2];
  const momChange = currentEntry && prevEntry ? momPct(currentEntry.totalCost, prevEntry.totalCost) : null;

  const topService = [...data.services].sort((a, b) => b.cost - a.cost)[0];
  const dirs = directoriesWithCosts(data);
  const eomForecast = data.forecastData[0]?.projected_cost ?? data.totalCost;
  const forecastAboveMtd = data.totalCost > 0 ? ((eomForecast - data.totalCost) / data.totalCost) * 100 : 0;

  const aiInsights = buildAiInsights(data, yearly, BTP_MSP_RATE);
  const sync = () => { setSyncing(true); window.setTimeout(() => setSyncing(false), 700); };

  const tabProps: BtpCostTabProps = {
    account,
    data,
    yearlyData: yearly,
    mspRate: BTP_MSP_RATE,
    chartColors: colors,
  };

  return (
    <div>

      <div className="mv-cost-header">
        <div className="mv-cost-header-title">
          <button className="mv-icon-button" aria-label="Back to BTP overview" onClick={() => navigate('/btp')}><ChevronLeftIcon size={20} /></button>
          <span className="mv-status mv-status--info">BTP</span>
          <Tooltip content={account.name}><h1 className="mv-title" style={{ fontSize: '1.25rem' }}>{account.name}</h1></Tooltip>
          {account.sample && <SampleDataBadge />}
        </div>
        <div className="mv-cost-header-controls">
          <div style={{ position: 'relative' }} ref={aiRef}>
            <button className="mv-secondary-button" onClick={() => setAiOpen((v) => !v)} aria-haspopup="menu" aria-expanded={aiOpen}><SparkleIcon size={15} style={{ marginRight: '0.375rem' }} />AI Insights</button>
            {aiOpen && (
              <div className="mv-nav-dropdown" style={{ right: 0, left: 'auto', width: '21.25rem', padding: '0.875rem' }}>
                <p className="mv-panel-title" style={{ marginBottom: '0.625rem' }}>AI Insights</p>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {aiInsights.length === 0 ? <p className="mv-muted">Not enough data for insights yet.</p> : aiInsights.map((insight, i) => (
                    <div key={i} className={`mv-inline-error mv-ai-insight mv-ai-insight--${insight.type}`}>
                      <strong>{insight.title}</strong>
                      <p style={{ margin: '2px 0 0' }}>{insight.detail}</p>
                    </div>
                  ))}
                </div>
                <p className="mv-muted" style={{ marginTop: '0.625rem' }}>Based on Month-to-Date data and monthly history · Auto-generated</p>
              </div>
            )}
          </div>
          <button className="mv-primary-button" onClick={sync} disabled={syncing}><RefreshIcon size={16} style={{ marginRight: '0.375rem' }} />{syncing ? 'Syncing…' : 'Sync'}</button>
          <PageTourButton />
        </div>
      </div>

      <CostViewTabs views={COST_VIEWS} active={activeTab} onChange={setActiveTab} />

      {!data.cisSucceeded && (
        <div className="mv-notice" style={{ marginBottom: '1rem' }}>
          CIS_Central not configured — add CIS_Central credentials to enable directory and subaccount hierarchy. COST_API data is still shown below.
        </div>
      )}

      <div className="mv-kpi-row-4">
        <article className="mv-kpi">
          <span className="mv-kpi-label">Month-to-Date Spend</span>
          <strong className="mv-kpi-value">{formatCurrency(data.totalCost, currency)}</strong>
          {momChange !== null ? (
            <span className="mv-muted" style={{ color: momChange > 0 ? 'var(--mv-danger)' : 'var(--mv-success)' }}>{momChange > 0 ? '▲' : '▼'} {Math.abs(momChange)}% MoM</span>
          ) : <span className="mv-muted">Flat</span>}
        </article>
        <article className="mv-kpi">
          <span className="mv-kpi-label">Services Active</span>
          <strong className="mv-kpi-value">{data.services.length}</strong>
          {topService && <span className="mv-muted">{topService.name} is top</span>}
        </article>
        <article className="mv-kpi">
          <span className="mv-kpi-label">{data.cisSucceeded ? 'Directories' : 'Environments'}</span>
          <strong className="mv-kpi-value">{data.cisSucceeded ? dirs.length : data.environments.length}</strong>
          <span className="mv-muted">{data.cisSucceeded ? `${data.subaccountHierarchy.length} subaccounts` : `${data.environments[0]?.type ?? '—'} leads`}</span>
        </article>
        <article className="mv-kpi">
          <span className="mv-kpi-label">Projected (EOM)</span>
          <strong className="mv-kpi-value">{formatCurrency(eomForecast, currency)}</strong>
          <span className={forecastAboveMtd > 20 ? 'mv-text-warning' : 'mv-muted'}>{forecastAboveMtd > 20 ? `+${forecastAboveMtd.toFixed(0)}% above Month-to-Date` : 'On track'}</span>
        </article>
      </div>

      <div {...costViewPanelProps(activeTab)}>
        {activeTab === 'executive' && <ExecutiveTab {...tabProps} />}
        {activeTab === 'operations' && <OperationsTab {...tabProps} />}
        {activeTab === 'hierarchy' && <HierarchyTab {...tabProps} />}
        {activeTab === 'technical' && <TechnicalTab {...tabProps} />}
      </div>
    </div>
  );
}
