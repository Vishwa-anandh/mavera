import { summarizeAdvisor } from '../model/azureDerivations';
import type { AzureAdvisorRecommendation } from '../model/azureTypes';

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const IMPACT_TONE = { High: 'danger', Medium: 'warning', Low: 'info' } as const;

/**
 * Azure Advisor recommendations: what Azure suggests, how much it matters (impact) and the saving it
 * estimates per month and per year. Highest impact first. These are Azure's own estimates, separate from the
 * Maitsys CSP opportunities shown beside them.
 */
export function AdvisorRecommendationsPanel({ recommendations }: { recommendations: AzureAdvisorRecommendation[] }) {
  const summary = summarizeAdvisor(recommendations);
  return (
    <section className="mv-panel">
      <div className="mv-panel-header">
        <div>
          <h3 className="mv-panel-title">Advisor Recommendations</h3>
          <p className="mv-muted mv-section-sub">
            {summary.items.length === 0
              ? 'Azure Advisor has no recommendations for this subscription.'
              : `${summary.items.length} ${summary.items.length === 1 ? 'recommendation' : 'recommendations'} from Azure Advisor, estimated to save ${money(summary.totalMonthly)} a month (${money(summary.totalAnnual)} a year).`}
          </p>
        </div>
      </div>
      {summary.items.length > 0 && (
        <ul className="mv-reco-list" aria-label="Azure Advisor recommendations">
          {summary.items.map((item) => (
            <li key={item.problem} className="mv-reco-item">
              <div className="mv-reco-main">
                <p className="mv-reco-problem">{item.problem}</p>
                <p className="mv-muted">{item.solution}</p>
                <p className="mv-reco-tags">
                  <span className={`mv-status mv-status--${IMPACT_TONE[item.impact]}`}>{item.impact} impact</span>
                  <span className="mv-status mv-status--neutral">{item.category}</span>
                  {item.term && <span className="mv-status mv-status--neutral">{item.term} term</span>}
                </p>
              </div>
              <div className="mv-reco-saving">
                <strong>{money(item.monthlySaving)}</strong>
                <span className="mv-muted">per month</span>
                <span className="mv-muted">{money(item.annualSaving)} a year</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
