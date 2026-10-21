import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMaveraTheme } from '../../../shared/theme/ThemeProvider';
import { chartColors } from '../../../shared/theme/tokens';
import { ChevronLeftIcon, ChevronDownIcon, RefreshIcon, SparkleIcon } from '../../../shared/ui/icons';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { CloudSpendSummary } from '../../../shared/ui/CloudSpendSummary';
import { daysInMonthOf } from '../../../shared/lib/costAnalysis';
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

function emptyCosts(base: AzureYearlyMonth): AzureCosts {
  return {
    totalCost: base.totalCost,
    forecast: 0,
    currency: 'USD',
    dailyCosts: base.dailyCosts,
    services: base.topServices,
    topResources: [],
    details: base.details,
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
  const grossSavingsPct = AZURE_MSP_RATE / (1 + AZURE_MSP_RATE) * 100;

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
    <div className="mv-cloud-detail">

      <div className="mv-cost-header">
        <div className="mv-cost-header-title">
          <button className="mv-icon-button" aria-label="Back to Azure overview" onClick={() => navigate('/azure')}><ChevronLeftIcon size={20} /></button>
          <span className="mv-status mv-status--info">Azure</span>
          <Tooltip content={account.name}><h1 className="mv-title mv-cost-title">{account.name}</h1></Tooltip>
        </div>
        <div className="mv-cost-header-controls">
          {MOCK_AZURE_ACCOUNTS.length > 1 && (
            <div className="mv-cost-menu" ref={switchRef}>
              <button className="mv-secondary-button" onClick={() => setSwitchOpen((v) => !v)} aria-haspopup="menu" aria-expanded={switchOpen}>Switch account<ChevronDownIcon size={14} className="mv-cost-menu-chevron" /></button>
              {switchOpen && (
                <div className="mv-nav-dropdown mv-cost-menu-list" role="menu">
                  {MOCK_AZURE_ACCOUNTS.map((a) => (
                    <button key={a.id} role="menuitem" className="mv-nav-dropdown-item mv-cost-menu-item" onClick={() => { setSwitchOpen(false); navigate(`/azure/${a.id}`); }}>
                      <span>{a.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="mv-cost-menu" ref={monthRef}>
            <button className="mv-secondary-button" onClick={() => setMonthOpen((v) => !v)} aria-haspopup="menu" aria-expanded={monthOpen}>
              {isCurrentMonth ? 'Month-to-Date' : `${MONTH_LABELS[selectedMonth!.month - 1]} ${selectedMonth!.year}`}<ChevronDownIcon size={14} className="mv-cost-menu-chevron" />
            </button>
            {monthOpen && (
              <div className="mv-nav-dropdown mv-cost-menu-list mv-cost-menu-list--months" role="menu">
                {[...MOCK_AZURE_YEARLY].reverse().map((m) => {
                  const isCur = m.year === currentYearly.year && m.month === currentYearly.month;
                  return (
                    <button key={`${m.year}-${m.month}`} role="menuitem" className="mv-nav-dropdown-item mv-cost-menu-item" onClick={() => { setMonthOpen(false); tabProps.onSelectMonth(m.year, m.month); }}>
                      <span>{MONTH_LABELS[m.month - 1]} {m.year}{isCur ? ' (Month-to-Date)' : ''}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mv-cost-menu" ref={aiRef}>
            <button className="mv-secondary-button" onClick={() => setAiOpen((v) => !v)} aria-haspopup="menu" aria-expanded={aiOpen}><SparkleIcon size={15} className="mv-cost-menu-icon" />AI Insights</button>
            {aiOpen && (
              <div className="mv-nav-dropdown mv-cost-menu-list mv-cost-menu-list--insights">
                <p className="mv-panel-title mv-cost-menu-title">AI Insights</p>
                <div className="mv-cost-insight-list">
                  {aiInsights.map((insight, i) => (
                    <div key={i} className={`mv-inline-error mv-ai-insight mv-ai-insight--${insight.type}`}>
                      <strong>{insight.title}</strong>
                      <p>{insight.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button className="mv-primary-button" onClick={sync} disabled={syncing}><RefreshIcon size={16} className="mv-cost-menu-icon" />{syncing ? 'Syncing…' : 'Sync'}</button>
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
        <div className="mv-notice mv-cost-banner">
          Viewing {MONTH_LABELS[selectedMonth!.month - 1]} {selectedMonth!.year} — historical data.{' '}
          <button className="mv-quiet-button mv-cost-banner-link" onClick={() => setSelectedMonth(null)}>Back to current</button>
        </div>
      )}

      <CloudSpendSummary
        isCurrentMonth={isCurrentMonth}
        spend={data.totalCost}
        changePct={momChange}
        daily={data.dailyCosts.map((point) => point.cost)}
        daysInMonth={daysInMonthOf(data.dailyCosts[0]?.date)}
        forecast={isCurrentMonth ? data.forecast : null}
        lastMonthTotal={lastMonth?.totalCost ?? null}
        dailyAverage={dailyAvg}
        todaySpend={todayCost}
        savings={mspSavings}
        savingsLines={[`${(AZURE_MSP_RATE * 100).toFixed(0)}% CSP discount · ${grossSavingsPct.toFixed(1)}% of gross spend`]}
        facts={[
          { label: 'Enabled services', value: data.services.length.toLocaleString(), detail: isCurrentMonth ? `${data.topResources.length.toLocaleString()} cost-tracked resources` : 'billed this month' },
          { label: 'Total resources', value: isCurrentMonth ? data.resources.total.toLocaleString() : '—', detail: isCurrentMonth ? `${data.resources.active.toLocaleString()} active` : 'not available for past months' },
        ]}
      />

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
