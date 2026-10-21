import { isSubscriptionWide } from '../model/azureDerivations';
import type { CspRecommendation } from '../model/azureTypes';

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const humanize = (value: string) => value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

/**
 * Maitsys CSP Savings Opportunities: the flat CSP pricing advantage on this month's spend, then each
 * itemised opportunity with what the resource costs now, what it would cost after the change and the saving.
 */
export function CspSavingsPanel({ recommendations, totalCost, mspRate }: { recommendations: CspRecommendation[]; totalCost: number; mspRate: number }) {
  return (
    <section className="mv-panel">
      <div className="mv-panel-header">
        <div>
          <h3 className="mv-panel-title">Maitsys CSP Savings Opportunities</h3>
          <p className="mv-muted mv-section-sub">
            CSP pricing saves {money(totalCost * mspRate)} a month ({(mspRate * 100).toFixed(1)}% on {money(totalCost)} of spend). These are further changes that would save more.
          </p>
        </div>
      </div>
      {recommendations.length === 0 ? (
        <p className="mv-muted">No further savings opportunities are open for this subscription.</p>
      ) : (
        <ul className="mv-reco-list" aria-label="Maitsys CSP savings opportunities">
          {recommendations.map((rec) => (
            <li key={rec.id} className="mv-reco-item">
              <div className="mv-reco-main">
                <p className="mv-reco-problem">{rec.description}</p>
                <p className="mv-muted">{isSubscriptionWide(rec.resource_id) || rec.resource_name === 'Subscription-wide' ? 'Subscription-wide' : rec.resource_name}</p>
                <p className="mv-reco-tags">
                  <span className="mv-status mv-status--neutral">{humanize(rec.resource_type)}</span>
                  {rec.action && <span className="mv-status mv-status--info">{rec.action}</span>}
                </p>
              </div>
              <div className="mv-reco-saving">
                <strong>{money(rec.estimated_savings)}</strong>
                <span className="mv-muted">per month</span>
                {rec.current_monthly_cost > 0 && <span className="mv-muted">{money(rec.current_monthly_cost)} now, {money(Math.max(0, rec.current_monthly_cost - rec.estimated_savings))} after</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
