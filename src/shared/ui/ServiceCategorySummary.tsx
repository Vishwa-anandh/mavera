import { Fragment, useId, useState } from 'react';
import type { CategorySummary } from '../lib/costAnalysis';
import { ChevronDownIcon } from './icons';
import { BarSeriesChart } from './BarSeriesChart';

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const compactMoney = (value: number) => (value >= 1000 ? `$${(value / 1000).toFixed(1).replace(/\.0$/, '')}k` : `$${Math.round(value)}`);

export interface ServiceCategorySummaryProps {
  summary: CategorySummary;
  title?: string;
  description?: string;
  headingLevel?: 'h2' | 'h3';
}

/**
 * Service Category Summary: spend by category as a Category / Services / Total Cost / Share table next to a bar
 * chart. Each category row opens to the services inside it (Service / Monthly Cost / % of Total), so
 * the chart, the roll-up and the detail all read from one grouping and the shares total exactly 100%.
 */
export function ServiceCategorySummary({ summary, title = 'Service Category Summary', description = 'Spend grouped into categories. Open a category to see its services.', headingLevel = 'h2' }: ServiceCategorySummaryProps) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const titleId = useId();
  const Heading = headingLevel;

  const toggle = (category: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });

  return (
    <section className="mv-panel" aria-labelledby={titleId}>
      <div className="mv-panel-header">
        <div>
          <Heading className="mv-panel-title" id={titleId}>{title}</Heading>
          <p className="mv-muted mv-section-sub">{description}</p>
        </div>
      </div>

      {summary.rows.length === 0 ? (
        <p className="mv-muted">No services to group yet.</p>
      ) : (
        <div className="mv-category-summary">
          <div className="mv-table-wrap">
            <table className="mv-table">
              <caption className="mv-sr-only">Service cost grouped by category. Each category can be opened to list its services.</caption>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col" className="mv-num">Services</th>
                  <th scope="col" className="mv-num">Total Cost</th>
                  <th scope="col" className="mv-num">Share</th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.map((row) => {
                  const expanded = open.has(row.category);
                  return (
                    <Fragment key={row.category}>
                      <tr>
                        <td data-label="Category" className="mv-stack-title">
                          <button type="button" className="mv-category-toggle" aria-expanded={expanded} aria-label={`${row.category}, ${row.services.length} ${row.services.length === 1 ? 'service' : 'services'}`} onClick={() => toggle(row.category)}>
                            <ChevronDownIcon size={14} className={expanded ? 'mv-category-chevron is-open' : 'mv-category-chevron'} />
                            <span>{row.category}</span>
                          </button>
                        </td>
                        <td data-label="Services" className="mv-num">{row.services.length}</td>
                        <td data-label="Total Cost" className="mv-num">{money(row.cost)}</td>
                        <td data-label="Share" className="mv-num">{row.sharePct.toFixed(1)}%</td>
                      </tr>
                      {expanded && row.services.map((service) => (
                        <tr key={`${row.category}-${service.name}`} className="mv-category-service-row">
                          <td data-label="Service" className="mv-stack-title"><span className="mv-category-service-name">{service.name}</span></td>
                          <td className="mv-category-blank" aria-hidden="true" />
                          <td data-label="Monthly Cost" className="mv-num">{money(service.cost)}</td>
                          <td data-label="% of Total" className="mv-num">{service.sharePct.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  <td data-label="Services" className="mv-num">{summary.serviceCount}</td>
                  <td data-label="Total Cost" className="mv-num">{money(summary.total)}</td>
                  <td data-label="Share" className="mv-num">{summary.rows.reduce((sum, row) => sum + row.sharePct, 0).toFixed(1)}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="mv-category-chart">
            <BarSeriesChart
              title="Spend by service category"
              data={summary.rows.map((row) => ({ name: row.category, cost: row.cost }))}
              series={[{ key: 'cost', label: 'Total cost' }]}
              format={money}
              axisFormat={compactMoney}
              height={220}
            />
          </div>
        </div>
      )}
    </section>
  );
}
