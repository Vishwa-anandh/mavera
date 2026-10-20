import { useMemo, useState } from 'react';
import type { OptimizationOpportunity } from '../../../data-access';
import { useOpportunityStates } from '../../../shared/lib/opportunityStore';
import { DonutChart } from '../../../shared/ui/DonutChart';
import { Select } from '../../../shared/ui/Select';
import { RefreshIcon, TrendUpIcon, CreditCardIcon, LockIcon, ClockIcon } from '../../../shared/ui/icons';
import { DetailDrawer, DetailList } from '../../../shared/ui/DetailDrawer';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { useMaveraTheme } from '../../../shared/theme/ThemeProvider';
import { chartColors } from '../../../shared/theme/tokens';
import { buildRecommendationsView, type ProviderFilter } from '../model/recommendationsDerivations';
import type { SavingsCategory } from '../model/recommendationsTypes';
import { applyRecalculation, groupSmallAreas, mspRowsOf, savingsByArea, topRecommendationsOf, visibleOpportunities } from '../model/savingsInsights';
import type { SavingsScope } from '../model/useSavingsScope';
import { MspSavingsPanel } from './MspSavingsPanel';
import { SavingsTrendPanel } from './SavingsTrendPanel';
import { TopRecommendationsPanel } from './TopRecommendationsPanel';

function formatCurrency(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(value);
}

const PROVIDER_LABELS: Record<ProviderFilter, string> = { '': 'All Providers', azure: 'Microsoft Azure', aws: 'Amazon AWS', btp: 'SAP BTP', gcp: 'Google Cloud' };

interface SavingsOverviewSectionProps {
  /** Provider filter, recalculation and access, owned by the page so the opportunity list below agrees with it. */
  scope: SavingsScope;
  /** Every optimisation opportunity; the section limits them to the selected provider and what the person may see. */
  opportunities: OptimizationOpportunity[];
  /** Opens one opportunity's detail (the drawer on the page below). */
  onOpenOpportunity: (id: string) => void;
}

/**
 * Savings overview (the former Recommendations page, ported from the reference CCM app's
 * RecommendationsPage.jsx): month-to-date spend and potential savings, the potential-versus-realised
 * trend, savings by category, the top recommendations, the savings you can control, and the Maitsys
 * MSP savings per provider. Everything follows one provider filter, and "Recalculate savings" re-runs
 * the (simulated) calculation. BTP has its own data-driven savings model, see recommendationsDerivations.ts.
 */
export function SavingsOverviewSection({ scope, opportunities, onOpenOpportunity }: SavingsOverviewSectionProps) {
  const { provider, setProvider, providerOptions, allowedProviders, hasAnyAccess, overviewEnabled, recalculation } = scope;
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  const states = useOpportunityStates();
  const [selectedCategory, setSelectedCategory] = useState<SavingsCategory | null>(null);

  const view = useMemo(() => applyRecalculation(buildRecommendationsView(provider), recalculation.factor), [provider, recalculation.factor]);
  const { countable } = useMemo(() => visibleOpportunities(opportunities, states, provider, allowedProviders), [opportunities, states, provider, allowedProviders]);
  const areas = useMemo(() => groupSmallAreas(savingsByArea(countable)), [countable]);
  const top = useMemo(() => topRecommendationsOf(countable, 5), [countable]);
  const mspRows = mspRowsOf(view.effectiveSpend, provider);
  const mspTotal = mspRows.reduce((sum, r) => sum + r.saving, 0);

  // The savings overview is a plan feature; without it the page shows only the opportunities.
  if (!overviewEnabled) return null;

  if (!hasAnyAccess) {
    return (
      <section className="mv-empty" aria-labelledby="savings-overview-title">
        <div className="mv-empty-icon" aria-hidden><LockIcon size={32} /></div>
        <h2 id="savings-overview-title">Savings overview needs cloud access</h2>
        <p>It requires access to at least one cloud provider (Azure, AWS, SAP BTP or GCP). Contact your organization admin to update your access rights.</p>
      </section>
    );
  }

  const areaColors = [colors.primary, colors.secondary, colors.tertiary, colors.axis, 'color-mix(in srgb, var(--mv-primary) 38%, var(--mv-surface))'];
  const annualised = view.totalCurrent * 12;

  return (
    <section id="savings" aria-labelledby="savings-overview-title" className="mv-savings-overview" aria-busy={recalculation.running}>
      <div className="mv-section-head">
        <div>
          <h2 id="savings-overview-title" className="mv-section-title">Savings overview</h2>
          <p className="mv-muted">Month-to-date spend, potential savings and Maitsys MSP rates (Azure 7% · AWS 3.5% · BTP 2% · GCP 2%).</p>
        </div>
        <div className="mv-heading-actions">
          <Select
            label="Provider"
            hideLabel
            value={provider}
            onChange={setProvider}
            options={providerOptions.map((p) => ({ value: p, label: PROVIDER_LABELS[p] }))}
          />
          <button type="button" className="mv-secondary-button" onClick={recalculation.start} disabled={recalculation.running}>
            <RefreshIcon size={16} style={{ marginRight: '0.375rem' }} />{recalculation.running ? 'Recalculating…' : 'Recalculate savings'}
          </button>
        </div>
      </div>
      <p className="mv-recalc-status" role="status">
        <ClockIcon size={13} aria-hidden />
        {recalculation.running ? 'Recalculating savings…' : `Last recalculated ${recalculation.lastAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
      </p>
      {recalculation.running && <div className="mv-progress" role="progressbar" aria-label="Recalculating savings" aria-valuetext="In progress"><span /></div>}

      <div className="mv-kpi-row-4" style={{ marginBottom: '1rem' }}>
        <article className="mv-kpi"><span className="mv-kpi-label">Total Amount</span><strong className="mv-kpi-value">{formatCurrency(view.totalCurrent)}</strong><span className="mv-muted">USD, Month-to-Date</span></article>
        {view.showTaxCards ? (
          <>
            <article className="mv-kpi"><span className="mv-kpi-label">Pre-tax Charges</span><strong className="mv-kpi-value">{formatCurrency(view.preTax ?? 0)}</strong></article>
            <article className="mv-kpi"><span className="mv-kpi-label">Sales Tax (7%)</span><strong className="mv-kpi-value">{formatCurrency(view.salesTax ?? 0)}</strong></article>
          </>
        ) : view.isBtpOnly ? (
          <article className="mv-kpi"><span className="mv-kpi-label">BTP Optimization Potential</span><strong className="mv-kpi-value">{formatCurrency(view.btpOptTotal)}</strong><span className="mv-muted">CPEA · Plan downgrade · Unused</span></article>
        ) : (
          <article className="mv-kpi"><span className="mv-kpi-label">Optimization Potential</span><strong className="mv-kpi-value">{formatCurrency(view.optTotal)}</strong><span className="mv-muted">RI · Right-sizing · Orphaned · Idle</span></article>
        )}
        <article className="mv-kpi"><span className="mv-kpi-label">Total Savings (Potential)</span><strong className="mv-kpi-value" style={{ color: 'var(--mv-success)' }}>{formatCurrency(view.totalSavings)}</strong><span className="mv-muted">{view.savingsPct.toFixed(2)}% of annualised spend</span></article>
      </div>

      <div className="mv-pair">
        <SavingsTrendPanel provider={provider} currentPotential={view.totalSavings} />
        <section className="mv-panel" aria-labelledby="savings-category-title">
          <div className="mv-panel-header">
            <div>
              <h3 id="savings-category-title" className="mv-panel-title">Savings by category</h3>
              <p className="mv-muted">Open opportunities by area, per month</p>
            </div>
          </div>
          {areas.length === 0 ? (
            <p className="mv-muted">No open opportunities for this selection.</p>
          ) : (
            <DonutChart
              title="Savings by category"
              totalLabel="Per month"
              format={(v) => formatCurrency(v, 0)}
              data={areas.map((a, i) => ({ label: a.area, value: a.saving, color: areaColors[i % areaColors.length] }))}
            />
          )}
        </section>
      </div>

      <div className="mv-pair">
        <TopRecommendationsPanel items={top} onOpen={onOpenOpportunity} />
        <CategoryCard
          title={view.isBtpOnly ? 'BTP Optimization Opportunities' : 'Savings by Optimization (you can control)'}
          amount={view.isBtpOnly ? view.btpOptTotal : view.optTotal}
          subtitle={view.isBtpOnly ? 'CPEA commitment model · service plan downgrades · unused instances · consolidation' : `Maitsys rates: RI 15% · Right-sizing 8% · Orphaned disks 2% · Idle IPs 1% · Other 4% of your ${provider ? provider.toUpperCase() : 'total'} spend.`}
          categories={view.isBtpOnly ? view.btpOptCategories : view.optimizationCategories}
          onSelect={setSelectedCategory}
        />
      </div>

      <MspSavingsPanel rows={mspRows} annualisedPct={annualised > 0 ? (mspTotal / annualised) * 100 : 0} />

      {selectedCategory && (
        <DetailDrawer
          title={selectedCategory.label}
          subtitle={selectedCategory.description}
          onClose={() => setSelectedCategory(null)}
        >
          <p className="mv-detail-lead">{selectedCategory.hint}</p>
          <DetailList items={[{ label: 'Maitsys savings', value: <strong style={{ color: 'var(--mv-success)' }}>{formatCurrency(selectedCategory.amount)}</strong> }]} />
          <h3 className="mv-detail-heading">Affected resources ({selectedCategory.recommendations.length})</h3>
          {selectedCategory.recommendations.length > 0 ? (
            <div style={{ display: 'grid', gap: '0.625rem' }}>
              {selectedCategory.recommendations.map((rec) => (
                <div key={rec.id} style={{ border: '1px solid var(--mv-divider)', borderRadius: '0.75rem', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 500 }}>{rec.action || 'Optimize'} <span className="mv-status mv-status--neutral" style={{ marginLeft: '0.375rem', textTransform: 'uppercase' }}>{rec.provider}</span></p>
                    <p className="mv-muted" style={{ margin: '0.25rem 0 0' }}>{rec.description}</p>
                  </div>
                  <strong style={{ color: 'var(--mv-success)', flex: 'none' }}>+{formatCurrency(rec.estimated_savings)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CreditCardIcon size={28} />}
              heading="No specific resources"
              explanation="This is a passive or estimated saving based on your total spend, so there is nothing to act on resource by resource."
            />
          )}
        </DetailDrawer>
      )}
    </section>
  );
}

function CategoryCard({ title, amount, subtitle, categories, onSelect }: { title: string; amount: number; subtitle: string; categories: SavingsCategory[]; onSelect: (c: SavingsCategory) => void }) {
  return (
    <section className="mv-panel" aria-label={title}>
      <div className="mv-panel-header">
        <h3 className="mv-panel-title">{title}</h3>
        <strong style={{ color: 'var(--mv-success)' }}>{formatCurrency(amount)}</strong>
      </div>
      <p className="mv-muted" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>{subtitle}</p>
      {categories.length === 0 ? (
        <p className="mv-muted">No categories to show for this selection.</p>
      ) : (
        <div style={{ display: 'grid', gap: '0.25rem' }}>
          {categories.map((c) => (
            <button key={c.key} type="button" className="mv-account-row-body" style={{ width: '100%' }} onClick={() => onSelect(c)}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <strong style={{ fontSize: '0.8125rem' }}>{c.label}</strong>
                  <strong style={{ color: 'var(--mv-success)', flex: 'none' }}>{formatCurrency(c.amount)}</strong>
                </span>
                <span className="mv-muted" style={{ display: 'block', margin: '2px 0 0', fontSize: '0.75rem' }}>{c.description}</span>
              </span>
              <TrendUpIcon size={16} style={{ color: 'var(--mv-text-muted)', flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
