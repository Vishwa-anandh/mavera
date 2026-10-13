import { useState } from 'react';
import { oneOf, useRememberedState } from '../../../shared/lib/useRememberedState';
import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import { useAuth } from '../../auth';
import { derivePermissions } from '../../../shared/lib/permissions';
import { DonutChart } from '../../../shared/ui/DonutChart';
import { Select } from '../../../shared/ui/Select';
import { RefreshIcon, TrendUpIcon, CreditCardIcon, CloseIcon, LockIcon } from '../../../shared/ui/icons';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { buildRecommendationsView, type ProviderFilter } from '../model/recommendationsDerivations';
import type { SavingsCategory } from '../model/recommendationsTypes';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

const PROVIDER_LABELS: Record<ProviderFilter, string> = { '': 'All Providers', azure: 'Microsoft Azure', aws: 'Amazon AWS', btp: 'SAP BTP', gcp: 'Google Cloud' };

/**
 * Recommendations ("Savings Overview"), ported from the reference CCM
 * app's RecommendationsPage.jsx: a provider filter, KPI row (total spend /
 * pre-tax+sales-tax or BTP-specific card / total savings), a donut +
 * top-recommendations pair, and two category-card sections (Optimization
 * opportunities and Maitsys MSP savings). BTP gets its own data-driven
 * savings model (CPEA/plan/unused/consolidation) since the standard
 * RI/right-sizing/orphaned-disk model doesn't apply to it — see
 * recommendationsDerivations.ts for the full ported business logic.
 */
export function RecommendationsPage() {
  const { user, cloudAccess, invoiceOnly } = useAuth();
  const permissions = derivePermissions(user, cloudAccess, invoiceOnly);
  const hasAnyAccess = permissions.azure.canView || permissions.aws.canView || permissions.btp.canView || permissions.gcp.canView;

  const [storedProvider, setProviderFilter] = useRememberedState<ProviderFilter>('cloud', 'recommendations-provider', '', oneOf(['', 'azure', 'aws', 'btp', 'gcp']));
  const [selectedCategory, setSelectedCategory] = useState<SavingsCategory | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const recalculate = () => { setRecalculating(true); window.setTimeout(() => setRecalculating(false), 500); };

  if (!hasAnyAccess) {
    return (
      <div>
        <AppBreadcrumb items={[{ label: 'Cloud Cost', path: '/cloud/overview' }, { label: 'Recommendations' }]} />
        <div className="mv-empty">
          <div className="mv-empty-icon" aria-hidden><LockIcon size={32} /></div>
          <h2>Access Restricted</h2>
          <p>This page requires access to at least one cloud provider (Azure, AWS, SAP BTP or GCP). Contact your organization admin to update your access rights.</p>
        </div>
      </div>
    );
  }

  const availableProviders: ProviderFilter[] = ['', 'azure', 'aws', 'btp', 'gcp'].filter((p) => p === '' || permissions[p as 'azure' | 'aws' | 'btp' | 'gcp'].canView) as ProviderFilter[];
  const providerFilter: ProviderFilter = availableProviders.includes(storedProvider) ? storedProvider : '';
  const view = buildRecommendationsView(providerFilter);

  return (
    <div>
      <AppBreadcrumb items={[{ label: 'Cloud Cost', path: '/cloud/overview' }, { label: 'Recommendations' }]} />
      <div className="mv-page-heading">
        <div>
          <h1 className="mv-title">Savings Overview</h1>
          <p className="mv-subtitle">Optimization opportunities + Maitsys MSP savings (Azure 7% · AWS 3.5% · BTP 2% · GCP 2%).</p>
        </div>
        <Select
          label="Provider"
          hideLabel
          style={{ height: 44 }}
          value={providerFilter}
          onChange={setProviderFilter}
          options={availableProviders.map((p) => ({ value: p, label: PROVIDER_LABELS[p] }))}
        />
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

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 2fr)', gap: 16, marginBottom: 16 }}>
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">Savings Breakdown</h2></div>
          {view.donutData.length === 0 ? (
            <p className="mv-muted">No savings identified for this selection.</p>
          ) : (
            <DonutChart title="Savings breakdown" totalLabel="Savings" data={view.donutData.map((d, i) => ({ label: d.name, value: d.value, color: ['var(--mv-primary)', 'var(--mv-success)', 'var(--mv-warning)', 'var(--mv-danger)', 'var(--mv-text-muted)'][i % 5] }))} />
          )}
        </section>
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">Top Recommendations</h2></div>
          {view.topRecommendations.length === 0 ? (
            <p className="mv-muted">No specific recommendations available for this selection.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {view.topRecommendations.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'var(--mv-surface-subtle)' }}>
                  <div style={{ minWidth: 0 }}>
                    <Tooltip content={r.title}><p style={{ margin: 0, fontWeight: 500 }}>{r.title}</p></Tooltip>
                    <span className={`mv-status mv-status--${r.impact === 'High' ? 'danger' : r.impact === 'Medium' ? 'warning' : 'neutral'}`} style={{ marginTop: 4 }}>{r.impact} impact</span>
                  </div>
                  <strong style={{ color: 'var(--mv-success)', flex: 'none' }}>+{formatCurrency(r.savings)}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="mv-row-3col" style={{ marginBottom: 16 }}>
        <CategoryCard
          title={view.isBtpOnly ? 'BTP Optimization Opportunities' : 'Savings by Optimization (You Can Control)'}
          amount={view.isBtpOnly ? view.btpOptTotal : view.optTotal}
          subtitle={view.isBtpOnly ? 'CPEA commitment model · service plan downgrades · unused instances · consolidation' : `Maitsys rates: RI 15% · Right-sizing 8% · Orphaned disks 2% · Idle IPs 1% · Other 4% of your ${providerFilter ? providerFilter.toUpperCase() : 'total'} spend.`}
          categories={view.isBtpOnly ? view.btpOptCategories : view.optimizationCategories}
          onSelect={setSelectedCategory}
        />
        <CategoryCard
          title="Maitsys MSP Savings (Per-Provider Rates)"
          amount={view.cspCategories.reduce((s, c) => s + c.amount, 0)}
          subtitle={view.isBtpOnly ? "Maitsys' SAP partnership provides a 2% reduction on SAP BTP consumption — applied automatically." : 'Savings applied automatically via Maitsys contracted MSP/CSP rates.'}
          categories={view.cspCategories}
          onSelect={setSelectedCategory}
        />
      </div>

      <div className="mv-notice" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <span><strong>Tip:</strong> Take action on the top optimization opportunities to maximize your savings.</span>
        <button className="mv-secondary-button" onClick={recalculate} disabled={recalculating}><RefreshIcon size={16} style={{ marginRight: 6 }} />{recalculating ? 'Recalculating…' : 'Recalculate Savings'}</button>
      </div>

      {selectedCategory && (
        <div className="mv-dialog-backdrop" onClick={() => setSelectedCategory(null)}>
          <section className="mv-dialog mv-dialog--wide" role="dialog" aria-modal="true" aria-label={selectedCategory.label} onClick={(e) => e.stopPropagation()}>
            <div className="mv-panel-header">
              <div>
                <h2 className="mv-panel-title">{selectedCategory.label}</h2>
                <p className="mv-muted" style={{ margin: '2px 0 0' }}>{selectedCategory.description}</p>
              </div>
              <button className="mv-icon-button" aria-label="Close" onClick={() => setSelectedCategory(null)}><CloseIcon size={18} /></button>
            </div>
            <div className="mv-inline-error" style={{ marginBottom: 20, color: 'var(--mv-text)', background: 'var(--mv-surface-subtle)', borderColor: 'var(--mv-divider)' }}>
              {selectedCategory.hint}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>Affected Resources ({selectedCategory.recommendations.length})</h3>
              <div style={{ textAlign: 'right' }}>
                <p className="mv-muted" style={{ margin: 0 }}>Maitsys Savings</p>
                <strong style={{ color: 'var(--mv-success)', fontSize: 18 }}>{formatCurrency(selectedCategory.amount)}</strong>
              </div>
            </div>
            {selectedCategory.recommendations.length > 0 ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {selectedCategory.recommendations.map((rec) => (
                  <div key={rec.id} style={{ border: '1px solid var(--mv-divider)', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>{rec.action || 'Optimize'} <span className="mv-status mv-status--neutral" style={{ marginLeft: 6, textTransform: 'uppercase' }}>{rec.provider}</span></p>
                      <p className="mv-muted" style={{ margin: '4px 0 0' }}>{rec.description}</p>
                    </div>
                    <strong style={{ color: 'var(--mv-success)', flex: 'none' }}>+{formatCurrency(rec.estimated_savings)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mv-empty" style={{ margin: 0 }}>
                <div className="mv-empty-icon" aria-hidden><CreditCardIcon size={28} /></div>
                <h2>No specific resources found</h2>
                <p>This is a passive or estimated saving category based on your total spend.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function CategoryCard({ title, amount, subtitle, categories, onSelect }: { title: string; amount: number; subtitle: string; categories: SavingsCategory[]; onSelect: (c: SavingsCategory) => void }) {
  return (
    <section className="mv-panel">
      <div className="mv-panel-header">
        <h2 className="mv-panel-title">{title}</h2>
        <strong style={{ color: 'var(--mv-success)' }}>{formatCurrency(amount)}</strong>
      </div>
      <p className="mv-muted" style={{ marginTop: -8, marginBottom: 16 }}>{subtitle}</p>
      {categories.length === 0 ? (
        <p className="mv-muted">No categories to show for this selection.</p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {categories.map((c) => (
            <button key={c.key} type="button" className="mv-account-row-body" style={{ width: '100%', border: '1px solid var(--mv-divider)', borderRadius: 8, padding: 12 }} onClick={() => onSelect(c)}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ fontSize: 13 }}>{c.label}</strong>
                  <strong style={{ color: 'var(--mv-success)', flex: 'none' }}>{formatCurrency(c.amount)}</strong>
                </div>
                <p className="mv-muted" style={{ margin: '2px 0 0', fontSize: 12 }}>{c.description}</p>
              </span>
              <TrendUpIcon size={16} style={{ color: 'var(--mv-text-muted)', flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
