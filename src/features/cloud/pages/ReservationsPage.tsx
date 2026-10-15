import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cloudInsightsRepository, type Reservation } from '../../../data-access';
import { Select } from '../../../shared/ui/Select';
import { StatusTag } from '../../../shared/ui/StatusTag';
import { oneOf, useRememberedState } from '../../../shared/lib/useRememberedState';
import { useMaveraTheme } from '../../../shared/theme/ThemeProvider';
import { chartColors } from '../../../shared/theme/tokens';
import { PROVIDER_LABEL, formatMoney } from '../model/cloudFormat';
import { PageHeader } from '../../../shared/ui/PageHeader';

const UNDERUSED = 80;
const EXPIRY_WINDOW_DAYS = 90;
const ALL = 'All';

const daysUntil = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
function stateOf(r: Reservation): { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' } {
  const days = daysUntil(r.end);
  if (days < 0) return { label: 'Expired', tone: 'neutral' };
  if (days <= EXPIRY_WINDOW_DAYS) return { label: `Expires in ${days} d`, tone: 'warning' };
  if (r.utilizationPercent < UNDERUSED) return { label: 'Underused', tone: 'danger' };
  return { label: 'Active', tone: 'success' };
}

/**
 * CLOUD-05 — reservation and savings-plan coverage. Utilisation always says what it's measured
 * against. Provider recommendations are shown as estimates the provider supplied, never as
 * purchases or savings Mavera calculated itself.
 */
export function ReservationsPage() {
  const reservations = useMemo(() => cloudInsightsRepository.listReservations().sort((a, b) => a.end.localeCompare(b.end)), []);
  const opportunities = useMemo(() => cloudInsightsRepository.listOptimizationOpportunities().filter((o) => o.category === 'Commitments'), []);
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  const [provider, setProvider] = useRememberedState('cloud', 'reservations-provider', ALL, oneOf([ALL, 'azure', 'aws']));
  const [selectedId, setSelectedId] = useRememberedState('cloud', 'reservations-selected', reservations[0]?.id ?? '');

  const visible = reservations.filter((r) => provider === ALL || r.provider === provider);
  const selected = visible.find((r) => r.id === selectedId) ?? visible[0];
  const avgUtil = visible.length ? Math.round((visible.reduce((s, r) => s + r.utilizationPercent, 0) / visible.length) * 10) / 10 : null;
  const expiring = visible.filter((r) => { const d = daysUntil(r.end); return d >= 0 && d <= EXPIRY_WINDOW_DAYS; });
  const underused = visible.filter((r) => r.utilizationPercent < UNDERUSED);

  return (
    <div>
      <PageHeader title="Reserved Instances" subtitle="How well your reservations and savings plans are used, and which expire soon.">
        <Select label="Provider" hideLabel value={provider} onChange={setProvider} options={[{ value: ALL, label: 'All providers' }, { value: 'azure', label: 'Azure' }, { value: 'aws', label: 'AWS' }]} />
      </PageHeader>

      <div className="mv-kpi-row-4">
        <article className="mv-kpi"><span className="mv-kpi-label">Commitments</span><strong className="mv-kpi-value">{visible.length}</strong><span className="mv-muted">reservations and savings plans</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Average utilisation</span><strong className="mv-kpi-value">{avgUtil === null ? '—' : `${avgUtil}%`}</strong><span className="mv-muted">reserved capacity used, last 30 days</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Expiring in {EXPIRY_WINDOW_DAYS} days</span><strong className="mv-kpi-value">{expiring.length}</strong><span className="mv-muted">{expiring[0] ? `Next: ${expiring[0].name}` : 'None soon'}</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Underused</span><strong className="mv-kpi-value">{underused.length}</strong><span className="mv-muted">below {UNDERUSED}% utilisation</span></article>
      </div>

      {visible.length === 0 ? (
        <div className="mv-empty-inline"><p><strong>No reservations or savings plans for this provider.</strong></p></div>
      ) : (
        <div className="mv-stack-16">
          <section className="mv-panel" aria-labelledby="reservations-title">
            <div className="mv-panel-header"><div><h2 className="mv-panel-title" id="reservations-title">Reservations</h2><p className="mv-muted">Nearest expiry first. Choose one to see its utilisation.</p></div></div>
            <div className="mv-table-wrap">
              <table className="mv-table mv-table--stack">
                <thead><tr><th>Reservation</th><th>Scope</th><th>Region</th><th className="mv-num">Qty</th><th className="mv-num">Utilisation</th><th>Term</th><th>Ends</th><th>State</th></tr></thead>
                <tbody>
                  {visible.map((r) => {
                    const state = stateOf(r);
                    return (
                      <tr key={r.id} className={selected?.id === r.id ? 'is-selected' : undefined}>
                        <td data-label="Reservation" className="mv-stack-title">
                          <button type="button" className="mv-link-button" aria-pressed={selected?.id === r.id} onClick={() => setSelectedId(r.id)}>{r.name}</button>
                          <div className="mv-muted">{PROVIDER_LABEL[r.provider]} · {r.kind} · {r.service}</div>
                        </td>
                        <td data-label="Scope">{r.scope}</td>
                        <td data-label="Region">{r.region ?? 'Any region'}</td>
                        <td data-label="Qty" className="mv-num">{r.quantity}</td>
                        <td data-label="Utilisation" className="mv-num">{r.utilizationPercent}%</td>
                        <td data-label="Term">{r.term}</td>
                        <td data-label="Ends">{new Date(r.end).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                        <td data-label="State"><StatusTag tone={state.tone}>{state.label}</StatusTag></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {selected && (
            <section className="mv-panel" aria-labelledby="util-title">
              <div className="mv-panel-header"><div><h2 className="mv-panel-title" id="util-title">{selected.name}</h2><p className="mv-muted">Daily utilisation — {selected.utilizationBasis}</p></div></div>
              <div role="img" aria-label={`Daily utilisation of ${selected.name}`} style={{ height: 220 }}>
                <ResponsiveContainer>
                  <LineChart data={selected.trend}>
                    <CartesianGrid stroke={colors.grid} vertical={false} />
                    <XAxis dataKey="date" stroke={colors.axis} tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} interval="preserveStartEnd" />
                    <YAxis stroke={colors.axis} tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" width={40} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <ReferenceLine y={UNDERUSED} stroke="var(--mv-warning)" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="percent" name="Utilisation" stroke={colors.primary} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mv-muted">Dashed line: {UNDERUSED}% target. {selected.term} term, {selected.start} to {selected.end}.</p>
            </section>
          )}
        </div>
      )}

      <section className="mv-panel" aria-labelledby="commit-recs-title" style={{ marginTop: 16 }}>
        <div className="mv-panel-header">
          <div><h2 className="mv-panel-title" id="commit-recs-title">Commitment recommendations</h2><p className="mv-muted">Estimates supplied by the provider or Maitsys analysis. Not a purchase — review terms before committing.</p></div>
          <Link className="mv-quiet-button" to="/cloud/optimization">All opportunities</Link>
        </div>
        {opportunities.length === 0 ? <p className="mv-muted">No commitment recommendations right now.</p> : (
          <ul className="mv-plain-list mv-rec-list">
            {opportunities.map((o) => (
              <li key={o.id}>
                <span><strong>{o.title}</strong><span className="mv-muted">{PROVIDER_LABEL[o.provider]} · {o.rationale}</span><span className="mv-muted">{o.assumptions}</span></span>
                <span className="mv-rec-saving">{formatMoney(o.monthlySaving, o.currency)}<span className="mv-muted">/month est.</span></span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
