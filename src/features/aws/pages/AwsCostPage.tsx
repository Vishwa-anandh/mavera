import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMaveraTheme } from '../../../shared/theme/ThemeProvider';
import { chartColors } from '../../../shared/theme/tokens';
import { ChevronLeftIcon, ChevronDownIcon, RefreshIcon, SparkleIcon } from '../../../shared/ui/icons';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { useAwsAccounts } from '../model/AwsAccountContext';
import { MOCK_AWS_FULL, MOCK_AWS_YEARLY } from '../../../demo/aws/mockAwsData';
import type { AwsCosts, AwsYearlyMonth } from '../model/awsTypes';
import { buildAiInsights, findYearlyMonth } from '../model/awsDerivations';
import type { AwsCostTabProps } from '../model/AwsCostTabProps';
import { ExecutiveTab } from '../components/tabs/ExecutiveTab';
import { OperationsTab } from '../components/tabs/OperationsTab';
import { TechnicalTab } from '../components/tabs/TechnicalTab';

const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** AWS's own documented default CSP discount rate — lower than Azure's 7%
 * (see the reference's useMspRates DEFAULTS: aws: 0.035). */
const AWS_MSP_RATE = 0.035;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function emptyCosts(base: AwsYearlyMonth): AwsCosts {
  return {
    totalCost: base.totalCost,
    forecast: null,
    dailyCosts: base.dailyCosts,
    services: base.topServices,
    regions: base.topRegions,
    details: base.details,
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

export function AwsCostPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  const { accounts, getAccount } = useAwsAccounts();

  const account = getAccount(accountId ?? '');

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
          <p>This AWS account isn't in your connected accounts.</p>
          <button className="mv-primary-button" onClick={() => navigate('/aws')}>Back to AWS</button>
        </div>
      </div>
    );
  }

  const isCurrentMonth = selectedMonth === null;
  const histMonth = selectedMonth ? findYearlyMonth(MOCK_AWS_YEARLY, selectedMonth.year, selectedMonth.month) : undefined;
  const data: AwsCosts = isCurrentMonth ? MOCK_AWS_FULL.costs : histMonth ? emptyCosts(histMonth) : MOCK_AWS_FULL.costs;
  const hasData = data.dailyCosts.length > 0 || data.services.length > 0;

  const currentYearly = MOCK_AWS_YEARLY[MOCK_AWS_YEARLY.length - 1];
  const lastMonth = MOCK_AWS_YEARLY[MOCK_AWS_YEARLY.length - 2];
  const topService = [...data.services].sort((a, b) => b.cost - a.cost)[0];
  const topRegion = [...data.regions].sort((a, b) => b.cost - a.cost)[0];
  const mspSavings = Math.round(data.totalCost * AWS_MSP_RATE * 100) / 100;

  const aiInsights = buildAiInsights(MOCK_AWS_FULL.costs, MOCK_AWS_YEARLY, AWS_MSP_RATE);

  const sync = () => { setSyncing(true); window.setTimeout(() => setSyncing(false), 700); };

  const tabProps: AwsCostTabProps = {
    account,
    data,
    forecastSeries: MOCK_AWS_FULL.costs.dailyCosts,
    yearlyData: MOCK_AWS_YEARLY,
    resources: MOCK_AWS_FULL.resources,
    budgets: MOCK_AWS_FULL.budgets,
    instances: MOCK_AWS_FULL.instances,
    s3Buckets: MOCK_AWS_FULL.s3Buckets,
    cspRecommendations: MOCK_AWS_FULL.recommendations,
    isCurrentMonth,
    hasData,
    mspRate: AWS_MSP_RATE,
    chartColors: colors,
    onSelectMonth: (year, month) => setSelectedMonth(year === currentYearly.year && month === currentYearly.month ? null : { year, month }),
  };

  return (
    <div>

      <div className="mv-cost-header">
        <div className="mv-cost-header-title">
          <button className="mv-icon-button" aria-label="Back to AWS overview" onClick={() => navigate('/aws')}><ChevronLeftIcon size={20} /></button>
          <span className="mv-status mv-status--warning">AWS</span>
          <Tooltip content={account.name}><h1 className="mv-title" style={{ fontSize: 20 }}>{account.name}</h1></Tooltip>
        </div>
        <div className="mv-cost-header-controls">
          {accounts.length > 1 && (
            <div style={{ position: 'relative' }} ref={switchRef}>
              <button className="mv-secondary-button" onClick={() => setSwitchOpen((v) => !v)} aria-haspopup="menu" aria-expanded={switchOpen}>Switch account<ChevronDownIcon size={14} style={{ marginLeft: 6 }} /></button>
              {switchOpen && (
                <div className="mv-nav-dropdown" role="menu" style={{ right: 0, left: 'auto' }}>
                  {accounts.map((a) => (
                    <button key={a.id} role="menuitem" className="mv-nav-dropdown-item" style={{ width: '100%', border: 0, background: 'transparent', cursor: 'pointer' }} onClick={() => { setSwitchOpen(false); navigate(`/aws/account/${a.id}`); }}>
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
                {[...MOCK_AWS_YEARLY].reverse().map((m) => {
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
        <article className="mv-kpi"><span className="mv-kpi-label">{isCurrentMonth ? 'Month-to-Date Spend' : 'Month Spend'}</span><strong className="mv-kpi-value">{formatCurrency(data.totalCost)}</strong>{lastMonth && isCurrentMonth && (() => { const change = lastMonth.totalCost ? Math.round(((data.totalCost - lastMonth.totalCost) / lastMonth.totalCost) * 1000) / 10 : null; return change !== null ? <span className="mv-muted">{change >= 0 ? '▲' : '▼'} {Math.abs(change)}% vs last month</span> : null; })()}</article>
        <article className="mv-kpi"><span className="mv-kpi-label">EOM Forecast</span><strong className="mv-kpi-value">{data.forecast !== null ? formatCurrency(data.forecast) : '—'}</strong><span className="mv-muted">{isCurrentMonth ? 'End-of-month projection' : 'Not available for past months'}</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Top Service</span><strong className="mv-kpi-value" style={{ fontSize: 20 }}>{topService?.name ?? '—'}</strong>{topService && <span className="mv-muted">{formatCurrency(topService.cost)}</span>}</article>
        <article className="mv-kpi"><span className="mv-kpi-label">Top Region</span><strong className="mv-kpi-value" style={{ fontSize: 20 }}>{topRegion?.region ?? '—'}</strong>{topRegion && <span className="mv-muted">{formatCurrency(topRegion.cost)}</span>}</article>
        <article className="mv-kpi"><span className="mv-kpi-label">Maitsys CSP Savings</span><strong className="mv-kpi-value" style={{ color: 'var(--mv-success)' }}>{formatCurrency(mspSavings)}</strong></article>
      </div>

      {!hasData ? (
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
