import { BUDGET_NEAR_THRESHOLD, budgetAlerts } from '../model/azureDerivations';
import type { AzureAlert, AzureBudget } from '../model/azureTypes';

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

/**
 * Budget Alerts: the budgets that are over their cap or within reach of it (75% or more used), most urgent
 * first, with the alerts Azure has raised. A subscription whose budgets are all comfortable says so.
 */
export function BudgetAlertsPanel({ budgets, alerts }: { budgets: AzureBudget[]; alerts: AzureAlert[] }) {
  const summary = budgetAlerts(budgets);
  const nearPct = Math.round(BUDGET_NEAR_THRESHOLD * 100);

  return (
    <section className="mv-panel">
      <div className="mv-panel-header">
        <div>
          <h3 className="mv-panel-title">Budget Alerts</h3>
          <p className="mv-muted mv-section-sub">Budgets that are over their cap or at least {nearPct}% used.</p>
        </div>
      </div>

      {summary.rows.length === 0 ? (
        <p className="mv-muted">
          {budgets.length === 0 ? 'No budgets are configured for this subscription.' : `No budget is near its limit. ${summary.healthy} ${summary.healthy === 1 ? 'budget is' : 'budgets are'} under ${nearPct}%.`}
        </p>
      ) : (
        <ul className="mv-budget-alert-list" aria-label="Budgets near or over their limit">
          {summary.rows.map((row) => (
            <li key={row.name} className="mv-budget-alert">
              <div className="mv-budget-alert-head">
                <strong>{row.name}</strong>
                <span className={`mv-status mv-status--${row.status === 'over' ? 'danger' : 'warning'}`}>{row.status === 'over' ? 'Over budget' : 'Near limit'}</span>
              </div>
              <div
                className="mv-budget-alert-track"
                role="progressbar"
                aria-label={`${row.name} used`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(100, Math.round(row.pct))}
                aria-valuetext={`${row.pct}% of the cap used`}
              >
                <span style={{ width: `${Math.min(100, row.pct)}%`, background: `var(--mv-${row.status === 'over' ? 'danger' : 'warning'})` }} />
              </div>
              <p className="mv-muted">{money(row.spent)} of {money(row.amount)} used ({row.pct}%){row.status === 'over' ? `, ${money(row.spent - row.amount)} over` : ''}</p>
            </li>
          ))}
        </ul>
      )}

      {alerts.length > 0 && (
        <>
          <h4 className="mv-subheading">Alerts raised</h4>
          <ul className="mv-reco-list" aria-label="Alerts raised by Azure">
            {alerts.map((alert) => (
              <li key={alert.name + alert.description} className="mv-reco-item">
                <div className="mv-reco-main">
                  <p className="mv-reco-problem">{alert.name}</p>
                  <p className="mv-muted">{alert.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
