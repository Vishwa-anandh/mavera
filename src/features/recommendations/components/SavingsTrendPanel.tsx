import { useMemo, useState } from 'react';
import { cloudInsightsRepository } from '../../../data-access';
import { BarSeriesChart } from '../../../shared/ui/BarSeriesChart';
import { SegmentedToggle } from '../../../shared/ui/SegmentedToggle';
import { useMaveraTheme } from '../../../shared/theme/ThemeProvider';
import { chartColors } from '../../../shared/theme/tokens';
import type { ProviderFilter } from '../model/recommendationsDerivations';
import { savingsTrendOf, type TrendRange } from '../model/savingsInsights';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function money(n: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: fractionDigits, minimumFractionDigits: fractionDigits }).format(n);
}

function axisMoney(n: number): string {
  return n >= 1000 ? `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : `$${Math.round(n)}`;
}

const RANGES: Array<{ value: TrendRange; label: string; ariaLabel: string }> = [
  { value: '6M', label: '6 months', ariaLabel: 'Last 6 months' },
  { value: '12M', label: '12 months', ariaLabel: 'Last 12 months' },
  { value: 'YTD', label: 'Year to date', ariaLabel: 'Year to date' },
];

/** Potential versus realised savings by month for the selected provider (MSP discount plus optimisation). */
export function SavingsTrendPanel({ provider, currentPotential }: { provider: ProviderFilter; currentPotential: number }) {
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  const [range, setRange] = useState<TrendRange>('6M');
  const { monthly, realisation } = useMemo(() => ({ monthly: cloudInsightsRepository.getCostAnalytics().monthly, realisation: cloudInsightsRepository.getSavingsRealisation() }), []);
  const points = savingsTrendOf({ monthly, realisation, provider, range, currentPotential });
  const latest = points[points.length - 1];

  return (
    <section className="mv-panel" aria-labelledby="savings-trend-title">
      <div className="mv-panel-header mv-trend-head">
        <div>
          <h3 id="savings-trend-title" className="mv-panel-title">Savings trend</h3>
          <p className="mv-muted">Potential and realised savings per month</p>
        </div>
        <SegmentedToggle label="Savings trend range" value={range} onChange={setRange} options={RANGES} />
      </div>
      {latest && (
        <p className="mv-trend-summary" aria-live="polite">
          <span className="mv-trend-figure"><span className="mv-muted">Realised this month</span><strong>{money(latest.realised)}</strong></span>
          <span className="mv-trend-figure"><span className="mv-muted">Still to capture</span><strong>{money(Math.max(0, latest.potential - latest.realised))}</strong></span>
        </p>
      )}
      <BarSeriesChart
        title={`Savings trend, ${RANGES.find((r) => r.value === range)?.ariaLabel.toLowerCase()}`}
        height={220}
        data={points.map((p) => ({ name: `${MONTHS[Number(p.month.slice(5, 7)) - 1]} ${p.month.slice(2, 4)}`, realised: p.realised, potential: p.potential }))}
        series={[{ key: 'realised', label: 'Realised', color: colors.primary }, { key: 'potential', label: 'Potential', color: colors.tertiary }]}
        format={(v) => money(v, 2)}
        axisFormat={axisMoney}
      />
    </section>
  );
}
