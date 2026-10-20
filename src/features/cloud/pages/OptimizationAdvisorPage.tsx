import { useMemo, useState } from 'react';
import { cloudInsightsRepository, type OptimizationOpportunity } from '../../../data-access';
import { BarList } from '../../../shared/ui/BarList';
import { DetailDrawer, DetailList } from '../../../shared/ui/DetailDrawer';
import { Select } from '../../../shared/ui/Select';
import { StatusTag } from '../../../shared/ui/StatusTag';
import { fireToast } from '../../../shared/lib/toastEvents';
import { oneOf, useRememberedState } from '../../../shared/lib/useRememberedState';
import { PROVIDER_LABEL, formatMoney } from '../model/cloudFormat';
import { updateOpportunity, useOpportunityStates, type OpportunityState } from '../../../shared/lib/opportunityStore';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { useScrollToHash } from '../../../shared/lib/useScrollToHash';
import { SavingsOverviewSection, useSavingsScope } from '../../recommendations';

const ALL = 'All';
const PROVIDER_FILTER_LABELS = { '': 'All providers', azure: 'Azure', aws: 'AWS', btp: 'SAP BTP', gcp: 'Google Cloud' } as const;
const CATEGORIES: OptimizationOpportunity['category'][] = ['Rightsizing', 'Idle resources', 'Storage tiering', 'Commitments', 'Consolidation'];
const IMPACT_TONE = { High: 'danger', Medium: 'warning', Low: 'neutral' } as const;
const STATUSES: OpportunityState['status'][] = ['Open', 'In review', 'Dismissed'];
const OWNERS = ['Unassigned', 'platform-team', 'data-team', 'web-team', 'finance-it'];
const DISMISS_REASONS = ['Not applicable', 'Already planned', 'Business requirement', 'Estimate is wrong'];

/**
 * Savings & Optimization (CLOUD-04): the savings overview (former Recommendations page) followed
 * by the prioritised cost opportunities. `/recommendations` redirects here.
 * Opportunities: Totals leave out recommendations that overlap
 * another one (same spend) so savings aren't counted twice. Actions here only record ownership
 * and decisions; nothing is changed in the cloud from this page.
 */
export function OptimizationAdvisorPage() {
  useScrollToHash();
  const allOpportunities = useMemo(() => cloudInsightsRepository.listOptimizationOpportunities(), []);
  // One provider filter for the whole page (overview figures and this list); limited to providers the person may see.
  const scope = useSavingsScope();
  const { provider } = scope;
  const opportunities = useMemo(
    () => allOpportunities.filter((o) => scope.allowedProviders.includes(o.provider) && (provider === '' || o.provider === provider)),
    [allOpportunities, scope.allowedProviders, provider],
  );
  const states = useOpportunityStates();
  const [category, setCategory] = useRememberedState('cloud', 'optimization-category', ALL, oneOf([ALL, ...CATEGORIES]));
  const [impact, setImpact] = useRememberedState('cloud', 'optimization-impact', ALL, oneOf([ALL, 'High', 'Medium', 'Low']));
  const [status, setStatus] = useRememberedState('cloud', 'optimization-status', 'Active', oneOf(['Active', ...STATUSES]));
  const [openId, setOpenId] = useState<string | null>(null);
  const [dismissReason, setDismissReason] = useState(DISMISS_REASONS[0]);

  const stateOf = (o: OptimizationOpportunity): OpportunityState => states[o.id] ?? { status: 'Open' };
  const visible = opportunities
    .filter((o) => (category === ALL || o.category === category) && (impact === ALL || o.impact === impact))
    .filter((o) => (status === 'Active' ? stateOf(o).status !== 'Dismissed' : stateOf(o).status === status))
    .sort((a, b) => b.monthlySaving - a.monthlySaving);
  const active = opportunities.filter((o) => stateOf(o).status !== 'Dismissed');
  const countable = active.filter((o) => !o.overlapsWith || !active.some((other) => other.id === o.overlapsWith));
  const totalSaving = countable.reduce((sum, o) => sum + o.monthlySaving, 0);
  const overlapping = active.length - countable.length;
  const byCategory = CATEGORIES.map((c) => ({ c, saving: countable.filter((o) => o.category === c).reduce((s, o) => s + o.monthlySaving, 0) })).filter((x) => x.saving > 0).sort((a, b) => b.saving - a.saving);
  const open = opportunities.find((o) => o.id === openId);

  return (
    <div>
      <PageHeader title="Savings & Optimization" subtitle="What you could save, what Maitsys rates already save you, and every opportunity to act on." />

      <SavingsOverviewSection scope={scope} opportunities={allOpportunities} onOpenOpportunity={setOpenId} />

      <section id="opportunities" aria-labelledby="opportunities-title">
      <div className="mv-section-head">
        <div>
          <h2 id="opportunities-title" className="mv-section-title">Opportunities</h2>
          <p className="mv-muted">Ranked by estimated monthly saving{provider ? `, ${PROVIDER_FILTER_LABELS[provider]} only` : ''}. Assign them, review them or dismiss them with a reason.</p>
        </div>
      </div>

      <div className="mv-kpi-row-4">
        <article className="mv-kpi"><span className="mv-kpi-label">Estimated saving</span><strong className="mv-kpi-value">{formatMoney(totalSaving, 'USD')}</strong><span className="mv-muted">per month{overlapping ? `, ${overlapping} overlapping not double-counted` : ''}</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Open opportunities</span><strong className="mv-kpi-value">{active.length}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">High impact</span><strong className="mv-kpi-value">{active.filter((o) => o.impact === 'High').length}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">In review</span><strong className="mv-kpi-value">{opportunities.filter((o) => stateOf(o).status === 'In review').length}</strong><span className="mv-muted">{opportunities.filter((o) => stateOf(o).status === 'Dismissed').length} dismissed</span></article>
      </div>

      <div className="mv-columns-16-8">
        <section className="mv-panel" aria-label="Opportunities">
          <div className="mv-filter-bar" role="search" aria-label="Filter opportunities">
            <Select label="Category" hideLabel value={category} onChange={setCategory} options={[{ value: ALL, label: 'All categories' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]} />
            <Select label="Impact" hideLabel value={impact} onChange={setImpact} options={[{ value: ALL, label: 'Any impact' }, { value: 'High', label: 'High impact' }, { value: 'Medium', label: 'Medium impact' }, { value: 'Low', label: 'Low impact' }]} />
            {(!scope.overviewEnabled || !scope.hasAnyAccess) && (
              <Select label="Provider" hideLabel value={provider} onChange={scope.setProvider} options={scope.providerOptions.map((p) => ({ value: p, label: PROVIDER_FILTER_LABELS[p] }))} />
            )}
            <Select label="Status" hideLabel value={status} onChange={setStatus} options={[{ value: 'Active', label: 'Open and in review' }, ...STATUSES.map((s) => ({ value: s, label: s }))]} />
          </div>
          {visible.length === 0 ? (
            <div className="mv-empty-inline"><p><strong>No opportunities match these filters.</strong></p></div>
          ) : (
            <div className="mv-table-wrap">
              <table className="mv-table mv-table--stack">
                <caption className="mv-sr-only">Optimization opportunities, highest saving first</caption>
                <thead><tr><th>Recommendation</th><th>Resource</th><th>Impact</th><th className="mv-num">Est. saving / month</th><th>Owner</th><th>Status</th></tr></thead>
                <tbody>
                  {visible.map((o) => (
                    <tr key={o.id}>
                      <td data-label="Recommendation" className="mv-stack-title">
                        <button type="button" className="mv-link-button" onClick={() => setOpenId(o.id)}>{o.title}</button>
                        <div className="mv-muted">{o.category} · {PROVIDER_LABEL[o.provider]}{o.overlapsWith ? ' · overlaps another' : ''}</div>
                      </td>
                      <td data-label="Resource">{o.resource}</td>
                      <td data-label="Impact"><StatusTag tone={IMPACT_TONE[o.impact]}>{o.impact}</StatusTag></td>
                      <td data-label="Est. saving / month" className="mv-num">{formatMoney(o.monthlySaving, o.currency)}</td>
                      <td data-label="Owner">{stateOf(o).owner ?? <span className="mv-muted">Unassigned</span>}</td>
                      <td data-label="Status">{stateOf(o).status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="mv-panel" aria-labelledby="by-category-title">
          <div className="mv-panel-header"><h2 className="mv-panel-title" id="by-category-title">Saving by type</h2></div>
          <BarList label="Estimated monthly saving by type" items={byCategory.map(({ c, saving }) => ({ key: c, label: c, value: saving, display: formatMoney(saving, 'USD', { compact: true }), tone: 'success', selected: category === c, onSelect: () => setCategory(category === c ? ALL : c) }))} />
        </section>
      </div>
      </section>

      {open && (
        <DetailDrawer
          title={open.title}
          subtitle={<><StatusTag tone={IMPACT_TONE[open.impact]}>{open.impact} impact</StatusTag> {PROVIDER_LABEL[open.provider]} · {open.category}</>}
          onClose={() => setOpenId(null)}
          footer={
            stateOf(open).status === 'Dismissed' ? (
              <button type="button" className="mv-secondary-button" onClick={() => { updateOpportunity(open.id, { status: 'Open', dismissReason: undefined }); fireToast({ type: 'info', message: 'Opportunity reopened.' }); }}>Reopen</button>
            ) : (
              <>
                <button type="button" className="mv-secondary-button" onClick={() => { updateOpportunity(open.id, { status: 'Dismissed', dismissReason }); setOpenId(null); fireToast({ type: 'info', message: `Dismissed: ${dismissReason}.` }); }}>Dismiss</button>
                <button type="button" className="mv-primary-button" disabled={stateOf(open).status === 'In review'} onClick={() => { updateOpportunity(open.id, { status: 'In review' }); fireToast({ type: 'success', message: 'Sent for implementation review.' }); }}>
                  {stateOf(open).status === 'In review' ? 'In review' : 'Start review'}
                </button>
              </>
            )
          }
        >
          <p className="mv-detail-lead">{open.rationale}</p>
          <DetailList items={[
            { label: 'Estimated saving', value: `${formatMoney(open.monthlySaving, open.currency)} per month` },
            { label: 'Resource', value: open.resource },
            { label: 'Source', value: open.source },
            { label: 'Assumptions', value: open.assumptions },
            ...(open.overlapsWith ? [{ label: 'Overlap', value: 'Covers the same spend as another recommendation, so it isn’t added to the total.' }] : []),
            ...(stateOf(open).dismissReason ? [{ label: 'Dismissed because', value: stateOf(open).dismissReason }] : []),
          ]} />
          <div className="mv-form-stack">
            <Select label="Owner" value={stateOf(open).owner ?? 'Unassigned'} onChange={(owner) => updateOpportunity(open.id, { owner: owner === 'Unassigned' ? undefined : owner })} options={OWNERS.map((o) => ({ value: o, label: o }))} />
            {stateOf(open).status !== 'Dismissed' && <Select label="Reason if dismissing" value={dismissReason} onChange={setDismissReason} options={DISMISS_REASONS.map((r) => ({ value: r, label: r }))} />}
          </div>
          <p className="mv-muted">Mavera doesn’t change cloud resources. Starting a review records the decision; the change itself is made by the resource owner.</p>
        </DetailDrawer>
      )}
    </div>
  );
}
