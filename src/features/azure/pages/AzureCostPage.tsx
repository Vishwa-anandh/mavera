import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import { useMaveraTheme } from '../../../shared/theme/ThemeProvider';
import { chartColors } from '../../../shared/theme/tokens';
import { ChevronLeftIcon, ChevronDownIcon, RefreshIcon, SparkleIcon } from '../../../shared/ui/icons';
import { Tooltip } from '../../../shared/ui/Tooltip';
import {
  MOCK_AZURE_ACCOUNTS,
  MOCK_AZURE_FULL,
  MOCK_AZURE_YEARLY,
  MOCK_AZURE_CSP_RECOMMENDATIONS,
} from '../../../demo/azure/mockAzureData';
import type { AzureCosts, AzureYearlyMonth } from '../model/azureTypes';
import { buildAiInsights, findYearlyMonth, momPct } from '../model/azureDerivations';
import type { AzureCostTabProps } from '../model/AzureCostTabProps';
import { ExecutiveTab } from '../components/tabs/ExecutiveTab';
import { OperationsTab } from '../components/tabs/OperationsTab';
import { TechnicalTab } from '../components/tabs/TechnicalTab';

const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Flat 7% MSP CSP rate — the reference app's own documented default when
 * `/insights/msp-savings` hasn't returned a per-org override. */
const AZURE_MSP_RATE = 0.07;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function emptyCosts(base: AzureYearlyMonth): AzureCosts {
  return {
    totalCost: base.totalCost,
    forecast: 0,
    currency: 'USD',
    dailyCosts: base.dailyCosts,
    services: base.topServices,
    topResources: [],
    resourceGroups: base.resourceGroups,
    locations: base.locations,
    resources: { total: 0, active: 0, byType: [], allResources: [] },
    forecastData: [],
  };
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

export function AzureCostPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];

  const account = MOCK_AZURE_ACCOUNTS.find((a) => a.id === accountId);

  const [activeTab, setActiveTab] = useState<TabKey>('executive');
  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const switchRef = useOutsideClose(switchOpen, () => setSwitchOpen(false));
  const monthRef = useOutsideClose(monthOpen, () => setMonthOpen(false));
  const aiRef = useOutsideClose(aiOpen, () => setAiOpen(false));

  if (!account) {
    return (
      <div>
        <AppBreadcrumb items={[{ label: 'Cloud Cost', path: '/cloud/overview' }, { label: 'Azure' }]} />
        <div className="mv-empty">
          <h2>Account not found</h2>
          <p>This Azure subscription isn't in your connected accounts.</p>
          <button className="mv-primary-button" onClick={() => navigate('/azure')}>Back to Azure</button>
        </div>
      </div>
    );
  }

  const isCurrentMonth = selectedMonth === null;
  const histMonth = selectedMonth ? findYearlyMonth(MOCK_AZURE_YEARLY, selectedMonth.year, selectedMonth.month) : undefined;
  const data: AzureCosts = isCurrentMonth ? MOCK_AZURE_FULL.costs : histMonth ? emptyCosts(histMonth) : MOCK_AZURE_FULL.costs;
  const hasData = data.dailyCosts.length > 0 || data.services.length > 0 || data.topResources.length > 0 || (!isCurrentMonth && histMonth !== undefined);
  const isZeroCycle = isCurrentMonth && !hasData;

  const currentYearly = MOCK_AZURE_YEARLY[MOCK_AZURE_YEARLY.length - 1];
  const lastMonth = MOCK_AZURE_YEARLY[MOCK_AZURE_YEARLY.length - 2];
  const momChange = currentYearly && lastMonth ? momPct(currentYearly.totalCost, lastMonth.totalCost) : null;
  const dayOfMonth = new Date(2026, 8, 27).getDate();
  const dailyAvg = isCurrentMonth ? Math.round((data.totalCost / dayOfMonth) * 100) / 100 : null;
  const todayCost = isCurrentMonth ? (data.dailyCosts[data.dailyCosts.length - 1]?.cost ?? null) : null;
  const mspSavings = Math.round(data.totalCost * AZURE_MSP_RATE * 100) / 100;

  const aiInsights = buildAiInsights(MOCK_AZURE_FULL.costs, MOCK_AZURE_YEARLY, AZURE_MSP_RATE);

  const sync = () => { setSyncing(true); window.setTimeout(() => setSyncing(false), 700); };

  const tabProps: AzureCostTabProps = {
    account,
    data,
    forecast: MOCK_AZURE_FULL.costs.forecastData,
    yearlyData: MOCK_AZURE_YEARLY,
    budgets: MOCK_AZURE_FULL.budgets,
    advisorRecommendations: MOCK_AZURE_FULL.recommendations,
    cspRecommendations: MOCK_AZURE_CSP_RECOMMENDATIONS,
    alerts: MOCK_AZURE_FULL.alerts,
    invoices: MOCK_AZURE_FULL.invoices,
    reservationUtilization: MOCK_AZURE_FULL.reservationUtilization,
    isCurrentMonth,
    hasData,
    isZeroCycle,
    mspRate: AZURE_MSP_RATE,
    chartColors: colors,
    onSelectMonth: (year, month) => setSelectedMonth(year === currentYearly.year && month === currentYearly.month ? null : { year, month }),
  };

  return (
    <div>
      <AppBreadcrumb items={[{ label: 'Cloud Cost', path: '/cloud/overview' }, { label: 'Azure', path: '/azure' }, { label: account.name }]} />

      <div className="mv-cost-header">
        <div className="mv-cost-header-title">
          <button className="mv-icon-button" aria-label="Back to Azure overview" onClick={() => navigate('/azure')}><ChevronLeftIcon size={20} /></button>
          <span className="mv-status mv-status--info">Azure</span>
          <Tooltip content={account.name}><h1 className="mv-title" style={{ fontSize: 20 }}>{account.name}</h1></Tooltip>
        </div>
        <div className="mv-cost-header-controls">
          {MOCK_AZURE_ACCOUNTS.length > 1 && (
            <div style={{ position: 'relative' }} ref={switchRef}>
              <button className="mv-secondary-button" onClick={() => setSwitchOpen((v) => !v)} aria-haspopup="menu" aria-expanded={switchOpen}>Switch account<ChevronDownIcon size={14} style={{ marginLeft: 6 }} /></button>
              {switchOpen && (
                <div className="mv-nav-dropdown" role="menu" style={{ right: 0, left: 'auto' }}>
                  {MOCK_AZURE_ACCOUNTS.map((a) => (
                    <button key={a.id} role="menuitem" className="mv-nav-dropdown-item" style={{ width: '100%', border: 0, background: 'transparent', cursor: 'pointer' }} onClick={() => { setSwitchOpen(false); navigate(`/azure/${a.id}`); }}>
                      <span>{a.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div style={{ position: 'relative' }} ref={monthRef}>
            <button className="mv-secondary-button" onClick={() => setMonthOpen((v) => !v)} aria-haspopup="menu" aria-expanded={monthOpen}>
              {isCurrentMonth ? 'Month-to-Date' : `${MONTH_LABELS[selectedMonth!.month - 1]} ${selectedMonth!.year}`}<ChevronDownIcon size={14} style={{ marginLeft: 6 }} />
            </button>
            {monthOpen && (
              <div className="mv-nav-dropdown" role="menu" style={{ right: 0, left: 'auto', maxHeight: 320 }}>
                {[...MOCK_AZURE_YEARLY].reverse().map((m) => {
                  const isCur = m.year === currentYearly.year && m.month === currentYearly.month;
                  return (
                    <button key={`${m.year}-${m.month}`} role="menuitem" className="mv-nav-dropdown-item" style={{ width: '100%', border: 0, background: 'transparent', cursor: 'pointer' }} onClick={() => { setMonthOpen(false); tabProps.onSelectMonth(m.year, m.month); }}>
                      <span>{MONTH_LABELS[m.month - 1]} {m.year}{isCur ? ' (Month-to-Date)' : ''}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ position: 'relative' }} ref={aiRef}>
            <button className="mv-secondary-button" onClick={() => setAiOpen((v) => !v)} aria-haspopup="menu" aria-expanded={aiOpen}><SparkleIcon size={15} style={{ marginRight: 6 }} />AI Insights</button>
            {aiOpen && (
              <div className="mv-nav-dropdown" style={{ right: 0, left: 'auto', width: 340, padding: 14 }}>
                <p className="mv-panel-title" style={{ marginBottom: 10 }}>AI Insights</p>
                <div style={{ display: 'grid', gap: 8 }}>
                  {aiInsights.map((insight, i) => (
                    <div key={i} className={`mv-inline-error mv-ai-insight mv-ai-insight--${insight.type}`}>
                      <strong>{insight.title}</strong>
                      <p style={{ margin: '2px 0 0' }}>{insight.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button className="mv-primary-button" onClick={sync} disabled={syncing}><RefreshIcon size={16} style={{ marginRight: 6 }} />{syncing ? 'Syncing…' : 'Sync'}</button>
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

      {!isCurrentMonth && (
        <div className="mv-notice" style={{ marginBottom: 16 }}>
          Viewing {MONTH_LABELS[selectedMonth!.month - 1]} {selectedMonth!.year} — historical data.{' '}
          <button className="mv-quiet-button" style={{ padding: 0, minHeight: 'auto' }} onClick={() => setSelectedMonth(null)}>Back to current</button>
        </div>
      )}

      <div className="mv-kpi-row-5">
        <article className="mv-kpi"><span className="mv-kpi-label">{isCurrentMonth ? 'Month-to-Date Total Spend' : 'Month Spend'}</span><strong className="mv-kpi-value">{formatCurrency(data.totalCost)}</strong>{momChange !== null && isCurrentMonth && <span className="mv-muted">{momChange >= 0 ? '▲' : '▼'} {Math.abs(momChange)}% vs last month</span>}</article>
        <article className="mv-kpi"><span className="mv-kpi-label">Daily Avg Spend</span><strong className="mv-kpi-value">{dailyAvg !== null ? formatCurrency(dailyAvg) : '—'}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Today's Spend</span><strong className="mv-kpi-value">{todayCost !== null ? formatCurrency(todayCost) : (isCurrentMonth ? 'Syncing…' : '—')}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Forecast</span><strong className="mv-kpi-value">{formatCurrency(MOCK_AZURE_FULL.costs.forecast)}</strong><span className="mv-muted">Statistical month-end projection</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Maitsys CSP Savings</span><strong className="mv-kpi-value" style={{ color: 'var(--mv-success)' }}>{formatCurrency(mspSavings)}</strong></article>
      </div>

      {isZeroCycle ? (
        <div className="mv-empty"><h2>No Billable Activity</h2><p>Azure hasn't billed anything for this cycle yet.</p></div>
      ) : !hasData ? (
        <div className="mv-empty"><h2>No data available yet.</h2><p>{isCurrentMonth ? 'Cost data will appear once this billing cycle syncs.' : `No history is stored for ${MONTH_LABELS[selectedMonth!.month - 1]} ${selectedMonth!.year}.`}</p></div>
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
