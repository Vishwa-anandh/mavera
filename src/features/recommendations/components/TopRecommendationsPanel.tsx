import type { OptimizationOpportunity } from '../../../data-access';
import { StatusTag } from '../../../shared/ui/StatusTag';
import { PROVIDER_NAMES } from '../model/savingsInsights';

const IMPACT_TONE = { High: 'danger', Medium: 'warning', Low: 'neutral' } as const;

function money(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

interface TopRecommendationsPanelProps {
  /** Already ranked by monthly saving, biggest first. */
  items: OptimizationOpportunity[];
  /** Opens that opportunity's detail (the drawer further down this page). */
  onOpen: (id: string) => void;
}

/** The biggest savings to act on, each with its provider, resource and effort, opening the opportunity detail. */
export function TopRecommendationsPanel({ items, onOpen }: TopRecommendationsPanelProps) {
  return (
    <section className="mv-panel" aria-labelledby="top-recs-title">
      <div className="mv-panel-header">
        <div>
          <h3 id="top-recs-title" className="mv-panel-title">Top recommendations</h3>
          <p className="mv-muted">Ranked by monthly saving</p>
        </div>
        <a className="mv-quiet-button" href="#opportunities">All opportunities</a>
      </div>
      {items.length === 0 ? (
        <p className="mv-muted">No open opportunities for this selection.</p>
      ) : (
        <ol className="mv-top-recs" aria-label="Top recommendations by monthly saving">
          {items.map((o, index) => (
            <li key={o.id} className="mv-top-rec">
              <span className="mv-top-rec-rank" aria-hidden>{index + 1}</span>
              <div className="mv-top-rec-body">
                <button type="button" className="mv-link-button" onClick={() => onOpen(o.id)}>{o.title}</button>
                <p className="mv-muted">{PROVIDER_NAMES[o.provider]} · {o.resource}</p>
                <p className="mv-top-rec-tags">
                  <StatusTag tone={IMPACT_TONE[o.impact]}>{o.impact} impact</StatusTag>
                  <span className="mv-muted">Effort: {o.effort}</span>
                </p>
              </div>
              <strong className="mv-top-rec-saving">{money(o.monthlySaving)}<span className="mv-muted"> / month</span></strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
