import { useState } from 'react';
import { oneOf, useRememberedState } from '../../../shared/lib/useRememberedState';
import { useAuth } from '../../auth';
import { derivePermissions } from '../../../shared/lib/permissions';
import { DonutChart } from '../../../shared/ui/DonutChart';
import { Select } from '../../../shared/ui/Select';
import { RefreshIcon, TrendUpIcon, CreditCardIcon, LockIcon } from '../../../shared/ui/icons';
import { DetailDrawer, DetailList } from '../../../shared/ui/DetailDrawer';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { buildRecommendationsView, type ProviderFilter } from '../model/recommendationsDerivations';
import type { SavingsCategory } from '../model/recommendationsTypes';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

const PROVIDER_LABELS: Record<ProviderFilter, string> = { '': 'All Providers', azure: 'Microsoft Azure', aws: 'Amazon AWS', btp: 'SAP BTP', gcp: 'Google Cloud' };

/**
 * Savings overview (the former Recommendations page, ported from the reference CCM app's
 * RecommendationsPage.jsx): month-to-date spend and potential savings, the savings breakdown, and
 * the two category groups — optimizations you can make and Maitsys MSP savings already applied.
 * BTP gets its own data-driven savings model (CPEA/plan/unused/consolidation) — see
 * recommendationsDerivations.ts. It is the first section of Savings & Optimization; the individual
 * opportunities are listed below it, so the old "Top Recommendations" list isn't repeated here.
 */
export function SavingsOverviewSection() {
  const { user, cloudAccess, invoiceOnly, features } = useAuth();
  const permissions = derivePermissions(user, cloudAccess, invoiceOnly);
  const hasAnyAccess = permissions.azure.canView || permissions.aws.canView || permissions.btp.canView || permissions.gcp.canView;

  const [storedProvider, setProviderFilter] = useRememberedState<ProviderFilter>('cloud', 'recommendations-provider', '', oneOf(['', 'azure', 'aws', 'btp', 'gcp']));
  const [selectedCategory, setSelectedCategory] = useState<SavingsCategory | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const recalculate = () => { setRecalculating(true); window.setTimeout(() => setRecalculating(false), 500); };

  // The savings overview is a plan feature; without it the page shows only the opportunities.
  if (!features.recommendations) return null;

  if (!hasAnyAccess) {
    return (
      <section className="mv-empty" aria-labelledby="savings-overview-title">
        <div className="mv-empty-icon" aria-hidden><LockIcon size={32} /></div>
        <h2 id="savings-overview-title">Savings overview needs cloud access</h2>
        <p>It requires access to at least one cloud provider (Azure, AWS, SAP BTP or GCP). Contact your organization admin to update your access rights.</p>
      </section>
    );
  }

  const availableProviders: ProviderFilter[] = ['', 'azure', 'aws', 'btp', 'gcp'].filter((p) => p === '' || permissions[p as 'azure' | 'aws' | 'btp' | 'gcp'].canView) as ProviderFilter[];
  const providerFilter: ProviderFilter = availableProviders.includes(storedProvider) ? storedProvider : '';
  const view = buildRecommendationsView(providerFilter);

  return (
    <section id="savings" aria-labelledby="savings-overview-title" style={{ marginBottom: 24 }}>
      <div className="mv-section-head">
        <div>
          <h2 id="savings-overview-title" className="mv-section-title">Savings overview</h2>
          <p className="mv-muted">Month-to-date spend, potential savings and Maitsys MSP rates (Azure 7% · AWS 3.5% · BTP 2% · GCP 2%).</p>
        </div>
        <div className="mv-heading-actions">
          <Select
            label="Provider"
            hideLabel
            value={providerFilter}
            onChange={setProviderFilter}
            options={availableProviders.map((p) => ({ value: p, label: PROVIDER_LABELS[p] }))}
          />
          <button type="button" className="mv-secondary-button" onClick={recalculate} disabled={recalculating}>
            <RefreshIcon size={16} style={{ marginRight: 6 }} />{recalculating ? 'Recalculating…' : 'Recalculate'}
          </button>
        </div>
      </div>

      <div className="mv-kpi-row-4" style={{ marginBottom: 16 }}>
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

      <div className="mv-row-3col">
        <section className="mv-panel">
          <div className="mv-panel-header"><h3 className="mv-panel-title">Savings Breakdown</h3></div>
          {view.donutData.length === 0 ? (
            <p className="mv-muted">No savings identified for this selection.</p>
          ) : (
            <DonutChart title="Savings breakdown" totalLabel="Savings" data={view.donutData.map((d, i) => ({ label: d.name, value: d.value, color: ['var(--mv-primary)', 'var(--mv-success)', 'var(--mv-warning)', 'var(--mv-danger)', 'var(--mv-text-muted)'][i % 5] }))} />
          )}
        </section>
        <CategoryCard
          title={view.isBtpOnly ? 'BTP Optimization Opportunities' : 'Savings You Can Control'}
          amount={view.isBtpOnly ? view.btpOptTotal : view.optTotal}
          subtitle={view.isBtpOnly ? 'CPEA commitment model · service plan downgrades · unused instances · consolidation' : `Maitsys rates: RI 15% · Right-sizing 8% · Orphaned disks 2% · Idle IPs 1% · Other 4% of your ${providerFilter ? providerFilter.toUpperCase() : 'total'} spend.`}
          categories={view.isBtpOnly ? view.btpOptCategories : view.optimizationCategories}
          onSelect={setSelectedCategory}
        />
        <CategoryCard
          title="Maitsys MSP Savings"
          amount={view.cspCategories.reduce((s, c) => s + c.amount, 0)}
          subtitle={view.isBtpOnly ? "Maitsys' SAP partnership provides a 2% reduction on SAP BTP consumption — applied automatically." : 'Applied automatically through Maitsys contracted MSP/CSP rates.'}
          categories={view.cspCategories}
          onSelect={setSelectedCategory}
        />
      </div>

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
            <div style={{ display: 'grid', gap: 10 }}>
              {selectedCategory.recommendations.map((rec) => (
                <div key={rec.id} style={{ border: '1px solid var(--mv-divider)', borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{rec.action || 'Optimize'} <span className="mv-status mv-status--neutral" style={{ marginLeft: 6, textTransform: 'uppercase' }}>{rec.provider}</span></p>
                    <p className="mv-muted" style={{ margin: '4px 0 0' }}>{rec.description}</p>
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
    <section className="mv-panel">
      <div className="mv-panel-header">
        <h3 className="mv-panel-title">{title}</h3>
        <strong style={{ color: 'var(--mv-success)' }}>{formatCurrency(amount)}</strong>
      </div>
      <p className="mv-muted" style={{ marginTop: -8, marginBottom: 16 }}>{subtitle}</p>
      {categories.length === 0 ? (
        <p className="mv-muted">No categories to show for this selection.</p>
      ) : (
        <div style={{ display: 'grid', gap: 4 }}>
          {categories.map((c) => (
            <button key={c.key} type="button" className="mv-account-row-body" style={{ width: '100%' }} onClick={() => onSelect(c)}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ fontSize: 13 }}>{c.label}</strong>
                  <strong style={{ color: 'var(--mv-success)', flex: 'none' }}>{formatCurrency(c.amount)}</strong>
                </span>
                <span className="mv-muted" style={{ display: 'block', margin: '2px 0 0', fontSize: 12 }}>{c.description}</span>
              </span>
              <TrendUpIcon size={16} style={{ color: 'var(--mv-text-muted)', flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
