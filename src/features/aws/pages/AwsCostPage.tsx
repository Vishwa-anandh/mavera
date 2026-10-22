import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMaveraTheme } from '../../../shared/theme/ThemeProvider';
import { chartColors } from '../../../shared/theme/tokens';
import { ChevronLeftIcon, ChevronDownIcon, RefreshIcon, SparkleIcon } from '../../../shared/ui/icons';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { CloudSpendSummary } from '../../../shared/ui/CloudSpendSummary';
import { daysInMonthOf } from '../../../shared/lib/costAnalysis';
import { useAwsAccounts } from '../model/AwsAccountContext';
import { cloudSamplesRepository } from '../../../data-access';
import { SampleDataBadge } from '../../workspace';
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
  // Cost data: the provider's dataset (a connected account carries the sample dataset under its own name).
  const full = useMemo(() => cloudSamplesRepository.aws.full(), []);
  const yearly = useMemo(() => cloudSamplesRepository.aws.yearly(), []);

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
  const histMonth = selectedMonth ? findYearlyMonth(yearly, selectedMonth.year, selectedMonth.month) : undefined;
  const data: AwsCosts = isCurrentMonth ? full.costs : histMonth ? emptyCosts(histMonth) : full.costs;
  const hasData = data.dailyCosts.length > 0 || data.services.length > 0;

  const currentYearly = yearly[yearly.length - 1];
  const lastMonth = yearly[yearly.length - 2];
  const topService = [...data.services].sort((a, b) => b.cost - a.cost)[0];
  const topRegion = [...data.regions].sort((a, b) => b.cost - a.cost)[0];
  const mspSavings = Math.round(data.totalCost * AWS_MSP_RATE * 100) / 100;
  const optimizationSavings = full.recommendations.reduce((sum, r) => sum + r.estimated_savings, 0);
  const totalSavingsPct = data.totalCost > 0 ? ((data.totalCost * AWS_MSP_RATE + optimizationSavings) / data.totalCost) * 100 : 0;
  const monthChange = lastMonth && lastMonth.totalCost ? Math.round(((data.totalCost - lastMonth.totalCost) / lastMonth.totalCost) * 1000) / 10 : null;
  const dailyAverage = isCurrentMonth && data.dailyCosts.length > 0 ? Math.round((data.totalCost / data.dailyCosts.length) * 100) / 100 : null;
  const todayCost = isCurrentMonth ? (data.dailyCosts[data.dailyCosts.length - 1]?.cost ?? null) : null;

  const aiInsights = buildAiInsights(full.costs, yearly, AWS_MSP_RATE);

  const sync = () => { setSyncing(true); window.setTimeout(() => setSyncing(false), 700); };

  const tabProps: AwsCostTabProps = {
    account,
    data,
    forecastSeries: full.costs.dailyCosts,
    yearlyData: yearly,
    resources: full.resources,
    budgets: full.budgets,
    instances: full.instances,
    s3Buckets: full.s3Buckets,
    cspRecommendations: full.recommendations,
    isCurrentMonth,
    hasData,
    mspRate: AWS_MSP_RATE,
    chartColors: colors,
    onSelectMonth: (year, month) => setSelectedMonth(year === currentYearly.year && month === currentYearly.month ? null : { year, month }),
  };

  return (
    <div className="mv-cloud-detail">

      <div className="mv-cost-header">
        <div className="mv-cost-header-title">
          <button className="mv-icon-button" aria-label="Back to AWS overview" onClick={() => navigate('/aws')}><ChevronLeftIcon size={20} /></button>
          <span className="mv-status mv-status--warning">AWS</span>
          <Tooltip content={account.name}><h1 className="mv-title mv-cost-title">{account.name}</h1></Tooltip>
          {account.sample && <SampleDataBadge />}
        </div>
        <div className="mv-cost-header-controls">
          {accounts.length > 1 && (
            <div className="mv-cost-menu" ref={switchRef}>
              <button className="mv-secondary-button" onClick={() => setSwitchOpen((v) => !v)} aria-haspopup="menu" aria-expanded={switchOpen}>Switch account<ChevronDownIcon size={14} className="mv-cost-menu-chevron" /></button>
              {switchOpen && (
                <div className="mv-nav-dropdown mv-cost-menu-list" role="menu">
                  {accounts.map((a) => (
                    <button key={a.id} role="menuitem" className="mv-nav-dropdown-item mv-cost-menu-item" onClick={() => { setSwitchOpen(false); navigate(`/aws/account/${a.id}`); }}>
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
                {[...yearly].reverse().map((m) => {
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
        changePct={monthChange}
        daily={data.dailyCosts.map((point) => point.cost)}
        daysInMonth={daysInMonthOf(data.dailyCosts[0]?.date)}
        forecast={isCurrentMonth ? data.forecast : null}
        lastMonthTotal={lastMonth?.totalCost ?? null}
        dailyAverage={dailyAverage}
        todaySpend={todayCost}
        savings={mspSavings}
        savingsLines={[
          `${(AWS_MSP_RATE * 100).toFixed(1)}% CSP discount`,
          `With ${formatCurrency(optimizationSavings)} of optimization opportunities: ${totalSavingsPct.toFixed(1)}% of spend`,
        ]}
        facts={activeTab !== 'executive' ? [] : [
          { label: 'Active service types', value: data.services.length.toLocaleString(), detail: `${data.details.length} usage line item${data.details.length === 1 ? '' : 's'}` },
          { label: 'Total resources', value: full.resources.total.toLocaleString(), detail: `${full.resources.byType.length} resource types` },
          { label: 'Top service', value: topService?.name ?? '—', detail: topService ? formatCurrency(topService.cost) : undefined },
          { label: 'Top region', value: topRegion?.region ?? '—', detail: topRegion ? formatCurrency(topRegion.cost) : undefined },
        ]}
      />

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
