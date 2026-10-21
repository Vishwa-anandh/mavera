import { useId, useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { summarizeRegions, type NamedCost } from '../lib/costAnalysis';
import { useMaveraTheme } from '../theme/ThemeProvider';
import { chartTint } from '../theme/chartTint';
import { chartColors } from '../theme/tokens';
import { ChartDataDialog } from './ChartDataDialog';

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export interface CostByRegionProps {
  /** Cost per region (or location). They should add up to the month's total. */
  regions: NamedCost[];
  title?: string;
  description?: string;
  headingLevel?: 'h2' | 'h3';
  /** How many regions the list shows before "Show all". */
  visible?: number;
  id?: string;
}

/**
 * Cost by Region: a donut of the four biggest regions and the rest as Other, next to a ranked list of every
 * region with its share bar, percentage and cost. The list is the legend (each row carries the colour of its donut
 * slice), so nothing is shown twice; past `visible` rows it folds behind "Show all N regions". Provider neutral:
 * Azure locations and AWS regions use the same component.
 */
export function CostByRegion({ regions, title = 'Cost by Region', description, headingLevel = 'h2', visible = 8, id }: CostByRegionProps) {
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  const titleId = useId();
  const [showAll, setShowAll] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const Heading = headingLevel;
  const summary = useMemo(() => summarizeRegions(regions, 4), [regions]);

  const sliceColors = [colors.primary, colors.secondary, colors.tertiary, chartTint(colors.primary, mode, 0.5)];
  const otherColor = chartTint(colors.axis, mode, 0.45);
  const colorOf = (index: number) => (index < 4 ? sliceColors[index] : otherColor);

  const rows = showAll ? summary.rows : summary.rows.slice(0, visible);
  const sub = description ?? (summary.rows.length === 0 ? undefined : `${summary.rows.length} ${summary.rows.length === 1 ? 'region' : 'regions'} · ${money(summary.total)} month to date`);

  return (
    <section className="mv-panel mv-region-panel" aria-labelledby={titleId} id={id}>
      <div className="mv-panel-header">
        <div>
          <Heading className="mv-panel-title" id={titleId}>{title}</Heading>
          {sub && <p className="mv-muted mv-section-sub">{sub}</p>}
        </div>
      </div>

      {summary.rows.length === 0 || summary.total <= 0 ? (
        <p className="mv-muted">No regional cost data is available for this period.</p>
      ) : (
        <>
          <div className="mv-region-body">
            <div className="mv-region-donut" role="img" aria-label={`${title}: ${summary.slices.map((slice) => `${slice.name} ${slice.sharePct.toFixed(1)}%`).join(', ')}`}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={summary.slices} dataKey="cost" nameKey="name" innerRadius="66%" outerRadius="98%" paddingAngle={2} stroke="var(--mv-card-white, #fff)" strokeWidth={2} isAnimationActive={false}>
                    {summary.slices.map((slice, index) => (
                      <Cell key={slice.name} fill={slice.isOther ? otherColor : colorOf(index)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [money(Number(value)), String(name)]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mv-region-donut-label" aria-hidden>
                <strong>{money(summary.total)}</strong>
                <span>Total</span>
              </div>
            </div>

            <ol className="mv-region-list" aria-label={`${title}, ranked`}>
              {rows.map((row, index) => (
                <li key={row.name} className="mv-region-row">
                  <span className="mv-region-name" title={row.name}>
                    <i className="mv-chart-swatch" style={{ background: colorOf(index) }} aria-hidden />
                    <span>{row.name}</span>
                  </span>
                  <span className="mv-region-share">{row.sharePct.toFixed(1)}%</span>
                  <span className="mv-region-cost">{money(row.cost)}</span>
                  <span className="mv-region-bar" aria-hidden><span style={{ width: `${Math.max(row.sharePct, row.cost > 0 ? 0.5 : 0)}%`, background: colorOf(index) }} /></span>
                </li>
              ))}
            </ol>
          </div>
          <div className="mv-region-actions">
            {summary.rows.length > visible && (
              <button type="button" className="mv-quiet-button" aria-expanded={showAll} onClick={() => setShowAll((value) => !value)}>
                {showAll ? 'Show fewer regions' : `Show all ${summary.rows.length} regions`}
              </button>
            )}
            <button type="button" className="mv-quiet-button" aria-label={`View data: ${title}`} onClick={() => setTableOpen(true)}>View data</button>
          </div>
        </>
      )}

      {tableOpen && (
        <ChartDataDialog label={title} onClose={() => setTableOpen(false)}>
          <table className="mv-table">
            <thead><tr><th>Region</th><th className="mv-num">Share</th><th className="mv-num">Cost</th></tr></thead>
            <tbody>
              {summary.rows.map((row) => (
                <tr key={row.name}><td>{row.name}</td><td className="mv-num">{row.sharePct.toFixed(1)}%</td><td className="mv-num">{money(row.cost)}</td></tr>
              ))}
            </tbody>
            <tfoot><tr><th scope="row">Total</th><td className="mv-num">100.0%</td><td className="mv-num">{money(summary.total)}</td></tr></tfoot>
          </table>
        </ChartDataDialog>
      )}
    </section>
  );
}
