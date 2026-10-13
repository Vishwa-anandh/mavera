import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BtpCostTabProps } from '../../model/BtpCostTabProps';
import { computeHealthScore, momPct } from '../../model/btpDerivations';
import { DonutChart } from '../../../../shared/ui/DonutChart';

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function HealthGauge({ score, color }: { score: number; color: 'success' | 'warning' | 'danger' }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  return (
    <svg width={110} height={110} viewBox="0 0 110 110">
      <circle cx={55} cy={55} r={radius} fill="none" stroke="var(--mv-divider)" strokeWidth={10} />
      <circle
        cx={55} cy={55} r={radius} fill="none"
        stroke={`var(--mv-${color})`} strokeWidth={10} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        transform="rotate(-90 55 55)"
      />
      <text x={55} y={61} textAnchor="middle" fontSize={26} fontWeight={600} fill="var(--mv-text)">{score}</text>
    </svg>
  );
}

/**
 * Executive tab — CEO / Leadership audience. Ported from the reference
 * CCM app's BTP cost page executive block: the "Spend Health Banner"
 * (gauge + MTD/last-month/forecast/savings tiles), a 3-card executive KPI
 * row (Annualised Run Rate / Annual MSP Savings / Top Service
 * Concentration), Service + Subaccount distribution donuts side by side,
 * and the "12-Month Spend Timeline" bar chart.
 */
export function ExecutiveTab(props: BtpCostTabProps) {
  const { data, yearlyData, mspRate, chartColors } = props;
  const currency = data.currency;

  const current = yearlyData[yearlyData.length - 1];
  const previous = yearlyData[yearlyData.length - 2];
  const momChange = current && previous ? momPct(current.totalCost, previous.totalCost) : null;

  const sortedServices = [...data.services].sort((a, b) => b.cost - a.cost);
  const topService = sortedServices[0];
  const topServiceShare = topService && data.totalCost > 0 ? (topService.cost / data.totalCost) * 100 : 0;

  const eomForecast = data.forecastData[0]?.projected_cost ?? data.totalCost;
  const health = computeHealthScore(momChange, eomForecast, data.totalCost, topServiceShare);

  const dayOfMonth = 27;
  const burnRate = data.totalCost / dayOfMonth;
  const annualRunRate = burnRate * 30 * 12;
  const mspSavings = data.totalCost * mspRate;

  const serviceSlices = sortedServices.slice(0, 6).map((s, i) => ({ label: s.name, value: s.cost, color: [chartColors.primary, chartColors.secondary, chartColors.tertiary, chartColors.axis][i % 4] }));
  const subaccountSlices = [...data.subaccounts].sort((a, b) => b.cost - a.cost).slice(0, 6).map((s, i) => ({ label: s.name, value: s.cost, color: [chartColors.primary, chartColors.secondary, chartColors.tertiary, chartColors.axis][i % 4] }));

  const timelineData = yearlyData.map((m) => ({ label: `${MONTH_SHORT[m.month - 1]} '${String(m.year).slice(2)}`, cost: m.totalCost, isCurrent: m.year === current?.year && m.month === current?.month }));

  return (
    <div>
      <section className="mv-panel" style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', borderColor: `var(--mv-${health.color})`, borderWidth: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <HealthGauge score={health.score} color={health.color} />
          <div>
            <p className="mv-muted" style={{ margin: 0 }}>Spend Health Score</p>
            <strong style={{ fontSize: 20, color: `var(--mv-${health.color})` }}>{health.label}</strong>
            <p className="mv-muted" style={{ margin: '4px 0 0', maxWidth: 220 }}>Based on MoM trend, concentration risk &amp; forecast</p>
          </div>
        </div>
        <div className="mv-service-tile-grid" style={{ flex: 1, minWidth: 280 }}>
          <div className="mv-service-tile">
            <span className="mv-service-tile-name">This Month</span>
            <strong>{formatCurrency(data.totalCost, currency)}</strong>
            {momChange !== null && <span className="mv-muted">{momChange > 0 ? '+' : ''}{momChange}% MoM</span>}
          </div>
          <div className="mv-service-tile">
            <span className="mv-service-tile-name">Last Month</span>
            <strong>{previous ? formatCurrency(previous.totalCost, currency) : '—'}</strong>
            <span className="mv-muted">Actual spend</span>
          </div>
          <div className="mv-service-tile">
            <span className="mv-service-tile-name">EOM Forecast</span>
            <strong>{formatCurrency(eomForecast, currency)}</strong>
            <span className="mv-muted">Day {dayOfMonth} of 30</span>
          </div>
          <div className="mv-service-tile">
            <span className="mv-service-tile-name">MSP Savings</span>
            <strong style={{ color: 'var(--mv-success)' }}>{formatCurrency(mspSavings, currency)}</strong>
            <span className="mv-muted">{(mspRate * 100).toFixed(1)}% CSP discount</span>
          </div>
        </div>
      </section>

      <div className="mv-row-3col" style={{ marginBottom: 16 }}>
        <article className="mv-kpi"><span className="mv-kpi-label">Annualised Run Rate</span><strong className="mv-kpi-value">{formatCurrency(annualRunRate, currency)}</strong><span className="mv-muted">Based on {formatCurrency(burnRate, currency)}/day burn rate</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Annual MSP Savings</span><strong className="mv-kpi-value" style={{ color: 'var(--mv-success)' }}>{formatCurrency(mspSavings * 12, currency)}</strong><span className="mv-muted">{(mspRate * 100).toFixed(1)}% CSP discount · {formatCurrency(mspSavings, currency)} this month</span></article>
        <article className="mv-kpi">
          <span className="mv-kpi-label">Top Service Concentration</span>
          {topService ? (
            <>
              <strong className="mv-kpi-value">{topServiceShare.toFixed(0)}%</strong>
              <span className="mv-muted">{topService.name} · {formatCurrency(topService.cost, currency)}</span>
            </>
          ) : <strong className="mv-kpi-value">No service data yet</strong>}
        </article>
      </div>

      <div className="mv-row-3col" style={{ marginBottom: 16 }}>
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">Service Cost Distribution</h2></div>
          {serviceSlices.length === 0 ? <p className="mv-muted">No service data — sync to populate.</p> : <DonutChart title="Service cost distribution" totalLabel="Spend" data={serviceSlices} />}
        </section>
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">Subaccount Distribution</h2></div>
          {subaccountSlices.length === 0 ? <p className="mv-muted">No subaccount data.</p> : <DonutChart title="Subaccount distribution" totalLabel="Spend" data={subaccountSlices} />}
        </section>
      </div>

      <section className="mv-panel">
        <div className="mv-panel-header"><h2 className="mv-panel-title">12-Month Spend Timeline</h2></div>
        {timelineData.length === 0 ? <p className="mv-muted">No history yet — sync to populate.</p> : (
          <div role="img" aria-label="12-month spend timeline" style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={timelineData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="label" stroke={chartColors.axis} tick={{ fontSize: 12 }} />
                <YAxis stroke={chartColors.axis} tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value), currency), 'Cost']} contentStyle={{ borderRadius: 8, borderColor: chartColors.grid }} />
                <Bar dataKey="cost" radius={4}>
                  {timelineData.map((entry, i) => (
                    <Cell key={i} fill={entry.isCurrent ? chartColors.primary : chartColors.axis} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
