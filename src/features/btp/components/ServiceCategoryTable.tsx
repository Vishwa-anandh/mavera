import { useId, useState } from 'react';
import { ChevronDownIcon, TrendDownIcon, TrendUpIcon } from '../../../shared/ui/icons';
import { serviceCategorySummaryOf, type ServiceCostInput } from '../model/btpDerivations';

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

function Trend({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="mv-muted" aria-label="No previous month to compare">—</span>;
  if (pct === 0) return <span className="mv-muted">No change</span>;
  const up = pct > 0;
  return (
    <span className={`mv-trend-delta ${up ? 'is-up' : 'is-down'}`}>
      {up ? <TrendUpIcon size={13} /> : <TrendDownIcon size={13} />}
      <span className="mv-sr-only">{up ? 'Up ' : 'Down '}</span>
      {Math.abs(pct)}%
    </span>
  );
}

/**
 * Service Category Summary: the services grouped into categories with count, cost, share of the total
 * and month-over-month trend, sortable by cost, with a Total row that always stays last.
 */
export function ServiceCategoryTable({ services, currency }: { services: ServiceCostInput[]; currency: string }) {
  const [direction, setDirection] = useState<'desc' | 'asc'>('desc');
  const captionId = useId();
  const summary = serviceCategorySummaryOf(services, direction);

  if (services.length === 0) return <p className="mv-muted">No services to group yet.</p>;

  return (
    <div className="mv-table-wrap">
      <table className="mv-table mv-table--stack" aria-describedby={captionId}>
        <caption id={captionId} className="mv-sr-only">Service cost grouped by category. Use the Total cost heading to change the sort order.</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col" className="mv-num">Services</th>
            <th scope="col" className="mv-num" aria-sort={direction === 'desc' ? 'descending' : 'ascending'}>
              <button type="button" className="mv-sort-button" onClick={() => setDirection(direction === 'desc' ? 'asc' : 'desc')} aria-label={`Total cost, sorted ${direction === 'desc' ? 'highest first' : 'lowest first'}. Click to reverse.`}>
                Total cost <ChevronDownIcon size={14} className={direction === 'asc' ? 'mv-sort-icon is-asc' : 'mv-sort-icon'} />
              </button>
            </th>
            <th scope="col" className="mv-num">Share</th>
            <th scope="col">Trend</th>
          </tr>
        </thead>
        <tbody>
          {summary.rows.map((row) => (
            <tr key={row.category}>
              <td data-label="Category" className="mv-stack-title">{row.category}</td>
              <td data-label="Services" className="mv-num">{row.serviceCount}</td>
              <td data-label="Total cost" className="mv-num">{formatMoney(row.cost, currency)}</td>
              <td data-label="Share" className="mv-num">{row.sharePct.toFixed(1)}%</td>
              <td data-label="Trend"><Trend pct={row.trendPct} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="mv-stack-title">Total</th>
            <td data-label="Services" className="mv-num">{summary.total.serviceCount}</td>
            <td data-label="Total cost" className="mv-num">{formatMoney(summary.total.cost, currency)}</td>
            <td data-label="Share" className="mv-num">{summary.total.sharePct.toFixed(1)}%</td>
            <td data-label="Trend"><Trend pct={summary.total.trendPct} /></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
