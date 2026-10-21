import { Sparkline } from './Sparkline';

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export interface SpendFact {
  label: string;
  value: string;
  /** A short qualifier after the value, e.g. "16 active". */
  detail?: string;
}

export interface CloudSpendSummaryProps {
  /** True for the running month: forecast, daily pace and the month progress apply to it only. */
  isCurrentMonth: boolean;
  /** Month-to-date spend (the whole month's spend for a past month). */
  spend: number;
  /** Percent change of the month's spend against last month; null when there is no last month to compare. */
  changePct: number | null;
  /** Spend per day this month, in order, for the sparkline. */
  daily: number[];
  /** Calendar days in the month, for "Day 27 of 30". */
  daysInMonth: number | null;
  /** Month-end projection (the amount expected to be payable); null or 0 when there is none. */
  forecast: number | null;
  /** The previous full month's total, to compare the forecast with. */
  lastMonthTotal: number | null;
  dailyAverage: number | null;
  todaySpend: number | null;
  /** Maitsys CSP saving this month. */
  savings: number;
  /** Plain sentences under the saving: the discount rate, the share of gross spend, anything else the account adds. */
  savingsLines: string[];
  /** Quiet counts under the tiles (services, resources, top service...). */
  facts: SpendFact[];
}

const pct = (value: number) => `${Math.abs(value).toFixed(1)}%`;

/** "▲ 2.4% vs last month" with the direction spoken as well as drawn. Spend going up is the unwelcome direction. */
function Change({ value, suffix }: { value: number; suffix: string }) {
  const up = value >= 0;
  return (
    <span className={`mv-spend-change ${up ? 'mv-spend-change--up' : 'mv-spend-change--down'}`}>
      <span aria-hidden>{up ? '▲' : '▼'}</span> <span className="mv-sr-only">{up ? 'Up' : 'Down'}</span>{pct(value)} {suffix}
    </span>
  );
}

/**
 * One calm summary for a cloud account page: month-to-date spend (hero) with its change against last month and a
 * sparkline of the month, the month-end forecast, the daily pace (average and today) and the Maitsys CSP saving.
 * Counts such as services and resources sit under the tiles as a quiet line of facts rather than as tiles.
 */
export function CloudSpendSummary({ isCurrentMonth, spend, changePct, daily, daysInMonth, forecast, lastMonthTotal, dailyAverage, todaySpend, savings, savingsLines, facts }: CloudSpendSummaryProps) {
  const hasForecast = isCurrentMonth && !!forecast && forecast > 0;
  const forecastVsLast = hasForecast && lastMonthTotal ? ((forecast - lastMonthTotal) / lastMonthTotal) * 100 : null;
  const todayVsAverage = todaySpend !== null && dailyAverage ? ((todaySpend - dailyAverage) / dailyAverage) * 100 : null;
  const dayOfMonth = daily.length;

  return (
    <section className="mv-panel mv-spend-summary" aria-label="Spend summary">
      <div className="mv-spend-tiles">
        <article className="mv-spend-tile mv-spend-tile--hero">
          <span className="mv-spend-label">{isCurrentMonth ? 'Month-to-date spend' : 'Month spend'}</span>
          <strong className="mv-spend-value">{money(spend)}</strong>
          <span className="mv-spend-detail">
            {isCurrentMonth && changePct !== null ? <Change value={changePct} suffix="vs last month" /> : <span className="mv-muted">{isCurrentMonth ? 'No earlier month to compare yet' : 'Total billed for the month'}</span>}
          </span>
          {daily.length > 1 && (
            <span className="mv-spend-spark">
              <Sparkline values={daily} label="Spend per day this month" width={160} height={32} />
              {isCurrentMonth && daysInMonth ? <span className="mv-muted">Day {dayOfMonth} of {daysInMonth}</span> : null}
            </span>
          )}
        </article>

        <article className="mv-spend-tile">
          <span className="mv-spend-label">Forecast <span className="mv-status mv-status--neutral">Projected</span></span>
          <strong className="mv-spend-value">{hasForecast ? money(forecast as number) : '—'}</strong>
          {hasForecast ? (
            <>
              <span className="mv-spend-detail mv-muted">Month-end projection: what is expected to be payable.</span>
              {forecastVsLast !== null && <span className="mv-spend-detail"><Change value={forecastVsLast} suffix="vs last month" /></span>}
            </>
          ) : (
            <span className="mv-spend-detail mv-muted">{isCurrentMonth ? 'Not enough data for a projection yet.' : 'Forecasts apply to the current month only.'}</span>
          )}
        </article>

        <article className="mv-spend-tile">
          <span className="mv-spend-label">Daily pace</span>
          <strong className="mv-spend-value">{dailyAverage !== null ? money(dailyAverage) : '—'}</strong>
          {dailyAverage !== null ? (
            <>
              <span className="mv-spend-detail mv-muted">Average per day this month.</span>
              {todaySpend !== null && (
                <span className="mv-spend-detail">
                  Today <strong>{money(todaySpend)}</strong>
                  {todayVsAverage !== null && Math.abs(todayVsAverage) >= 0.05 && (
                    <> · <span className={`mv-spend-change ${todayVsAverage > 0 ? 'mv-spend-change--up' : 'mv-spend-change--down'}`}><span aria-hidden>{todayVsAverage > 0 ? '▲' : '▼'}</span> {pct(todayVsAverage)} {todayVsAverage > 0 ? 'above' : 'below'} average</span></>
                  )}
                </span>
              )}
            </>
          ) : (
            <span className="mv-spend-detail mv-muted">Shown for the current month.</span>
          )}
        </article>

        <article className="mv-spend-tile">
          <span className="mv-spend-label">Maitsys CSP savings</span>
          <strong className="mv-spend-value mv-spend-value--saving">{money(savings)}</strong>
          {savingsLines.map((line) => <span key={line} className="mv-spend-detail mv-muted">{line}</span>)}
        </article>
      </div>

      {facts.length > 0 && (
        <dl className="mv-spend-facts">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}{fact.detail && <span className="mv-muted"> · {fact.detail}</span>}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
