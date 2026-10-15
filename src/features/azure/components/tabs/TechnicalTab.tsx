import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Tooltip as UiTooltip } from '../../../../shared/ui/Tooltip';
import type { AzureCostTabProps } from '../../model/AzureCostTabProps';
import type {
  AzureInvoice,
  AzureNamedCost,
  AzureReservationUtilization,
  AzureResourceCost,
  AzureResources,
} from '../../model/azureTypes';
import { isSubscriptionWide } from '../../model/azureDerivations';

/**
 * Technical tab — Engineer / in-depth audience. Ported from the reference
 * CCM app's Azure cost page: the per-resource "Resource Allocation" table
 * and "By Resource Group" / "By Region" cards live in its `technical`
 * render block, and the resource-inventory breakdown (by type + full
 * used/unused list) is its `AzureResourceBreakdownCard`. Reservation
 * utilization and raw invoices are also sourced from the `technical` block.
 *
 * `data.topResources` and `data.resources` are intentionally zeroed out for
 * historical months (Azure doesn't retain resource-level granularity past
 * the current cycle) — those two sections are gated on `isCurrentMonth` and
 * show a notice instead. `data.resourceGroups`, `data.locations`,
 * `reservationUtilization` and `invoices` are not month-scoped and always
 * render.
 */
export function TechnicalTab(props: AzureCostTabProps) {
  const { data, isCurrentMonth, reservationUtilization, invoices, mspRate, chartColors } = props;

  const historicalNotice = "Resource-level detail isn't available for historical months — switch to Month-to-Date to see it.";

  return (
    <div>
      <section className="mv-panel" style={{ marginBottom: '1rem' }}>
        <div className="mv-panel-header">
          <h2 className="mv-panel-title">Top Resources by Cost</h2>
        </div>
        {!isCurrentMonth ? (
          <div className="mv-notice">{historicalNotice}</div>
        ) : (
          <TopResourcesTable resources={data.topResources} mspRate={mspRate} />
        )}
      </section>

      <section className="mv-panel" style={{ marginBottom: '1rem' }}>
        <div className="mv-panel-header">
          <h2 className="mv-panel-title">Resource Inventory</h2>
        </div>
        {!isCurrentMonth ? (
          <div className="mv-notice">{historicalNotice}</div>
        ) : (
          <ResourceInventorySection resources={data.resources} />
        )}
      </section>

      <div className="mv-row-3col" style={{ marginBottom: '1rem' }}>
        <NamedCostPanel title="By Resource Group" columnLabel="Resource Group" rows={data.resourceGroups} />
        <NamedCostPanel title="By Location" columnLabel="Location" rows={data.locations} />
      </div>

      <section className="mv-panel" style={{ marginBottom: '1rem' }}>
        <div className="mv-panel-header">
          <h2 className="mv-panel-title">Reservation Utilization (Daily)</h2>
        </div>
        <ReservationUtilizationChart data={reservationUtilization} colors={chartColors} />
      </section>

      <section className="mv-panel">
        <div className="mv-panel-header">
          <h2 className="mv-panel-title">Raw Invoices</h2>
        </div>
        <InvoicesTable invoices={invoices} />
      </section>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

/** Bare-UUID resource ids are subscription-wide, not a specific resource —
 * matches the reference's `shortId()` labelling (azureDerivations.ts). */
function resourceLabel(id: string, name: string): string {
  return isSubscriptionWide(id) ? 'Subscription-wide' : name;
}

const TOP_RESOURCES_VISIBLE = 15;

function TopResourcesTable({ resources, mspRate }: { resources: AzureResourceCost[]; mspRate: number }) {
  if (resources.length === 0) {
    return <p className="mv-muted">No resource-level cost data available for this month.</p>;
  }
  const sorted = [...resources].sort((a, b) => b.cost - a.cost);
  const visible = sorted.slice(0, TOP_RESOURCES_VISIBLE);

  return (
    <>
      <div className="mv-table-wrap">
        <table className="mv-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Resource</th>
              <th>Service</th>
              <th>Resource Group</th>
              <th className="mv-num">Month-to-Date Spend</th>
              <th className="mv-num">Est. CSP Savings</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((resource, index) => (
              <tr key={resource.id}>
                <td className="mv-muted">{String(index + 1).padStart(2, '0')}</td>
                <UiTooltip content={resource.id}><td>{resourceLabel(resource.id, resource.name)}</td></UiTooltip>
                <td>{resource.service}</td>
                <td>{resource.resourceGroup ?? '—'}</td>
                <td className="mv-num">{formatCurrency(resource.cost)}</td>
                <td className="mv-num" style={{ color: 'var(--mv-success)' }}>{formatCurrency(resource.cost * mspRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > TOP_RESOURCES_VISIBLE && (
        <p className="mv-muted" style={{ marginTop: '0.75rem' }}>
          Showing top {TOP_RESOURCES_VISIBLE} of {sorted.length} cost-tracked resources this month.
        </p>
      )}
    </>
  );
}

const ALL_RESOURCES_PAGE = 20;

function ResourceInventorySection({ resources }: { resources: AzureResources }) {
  const [showAll, setShowAll] = useState(false);

  if (resources.total === 0) {
    return <p className="mv-muted">No resource inventory data available for this month.</p>;
  }

  const unused = resources.total - resources.active;
  const sortedTypes = [...resources.byType].sort((a, b) => b.count - a.count);
  const sortedResources = [...resources.allResources].sort((a, b) => b.cost - a.cost);
  const visibleResources = showAll ? sortedResources : sortedResources.slice(0, ALL_RESOURCES_PAGE);

  return (
    <>
      <div className="mv-kpi-row-4" style={{ marginBottom: '1.25rem' }}>
        <article className="mv-kpi"><span className="mv-kpi-label">Total Resources</span><strong className="mv-kpi-value">{resources.total.toLocaleString()}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">With Spend</span><strong className="mv-kpi-value">{resources.active.toLocaleString()}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Unused ($0)</span><strong className="mv-kpi-value">{unused.toLocaleString()}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Resource Types</span><strong className="mv-kpi-value">{sortedTypes.length.toLocaleString()}</strong></article>
      </div>

      {sortedTypes.length > 0 && (
        <div className="mv-service-tile-grid" style={{ marginBottom: '1.25rem' }}>
          {sortedTypes.map((type) => (
            <div className="mv-service-tile" key={type.type}>
              <span className="mv-service-tile-badge">{(type.type.replace(/[^A-Za-z]/g, '').slice(0, 2) || '??').toUpperCase()}</span>
              <span className="mv-service-tile-name">{type.type}</span>
              <strong>{type.count.toLocaleString()}</strong>
            </div>
          ))}
        </div>
      )}

      {sortedResources.length > 0 && (
        <>
          <div className="mv-table-wrap">
            <table className="mv-table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Type</th>
                  <th>Resource Group</th>
                  <th>Status</th>
                  <th className="mv-num">Spend</th>
                </tr>
              </thead>
              <tbody>
                {visibleResources.map((resource) => (
                  <tr key={resource.id}>
                    <UiTooltip content={resource.id}><td>{resourceLabel(resource.id, resource.name)}</td></UiTooltip>
                    <td>{resource.type}</td>
                    <td>{resource.resourceGroup}</td>
                    <td><span className={`mv-status mv-status--${resource.hasSpend ? 'success' : 'neutral'}`}>{resource.hasSpend ? 'Active' : 'Unused'}</span></td>
                    <td className="mv-num">{resource.hasSpend ? formatCurrency(resource.cost) : '$0.00'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sortedResources.length > ALL_RESOURCES_PAGE && (
            <button type="button" className="mv-quiet-button" style={{ marginTop: '0.75rem' }} onClick={() => setShowAll((value) => !value)}>
              {showAll ? 'Show less' : `Show all ${sortedResources.length} resources`}
            </button>
          )}
        </>
      )}
    </>
  );
}

function NamedCostPanel({ title, columnLabel, rows }: { title: string; columnLabel: string; rows: AzureNamedCost[] }) {
  const sorted = [...rows].sort((a, b) => b.cost - a.cost);
  return (
    <section className="mv-panel">
      <div className="mv-panel-header">
        <h2 className="mv-panel-title">{title}</h2>
      </div>
      {sorted.length === 0 ? (
        <p className="mv-muted">No data available.</p>
      ) : (
        <div className="mv-table-wrap">
          <table className="mv-table">
            <thead><tr><th>{columnLabel}</th><th className="mv-num">Cost</th></tr></thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td className="mv-num">{formatCurrency(row.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ReservationUtilizationChart({ data, colors }: { data: AzureReservationUtilization[]; colors: AzureCostTabProps['chartColors'] }) {
  const [tableOpen, setTableOpen] = useState(false);

  if (data.length === 0) {
    return <p className="mv-muted">No reservation utilization data available.</p>;
  }

  const average = data.reduce((sum, point) => sum + point.utilizationPercentage, 0) / data.length;
  const formatDay = (value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const formatDayFull = (value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div>
      <p className="mv-muted" style={{ marginBottom: '0.75rem' }}>
        Average daily utilization: <strong style={{ color: 'var(--mv-text)' }}>{average.toFixed(1)}%</strong>
      </p>
      <div role="img" aria-label="Reservation utilization percentage by day" style={{ width: '100%', height: '15rem' }}>
        <ResponsiveContainer>
          <AreaChart data={data}>
            <CartesianGrid stroke={colors.grid} vertical={false} />
            <XAxis dataKey="usageDate" stroke={colors.axis} tick={{ fontSize: 12 }} tickFormatter={formatDay} />
            <YAxis stroke={colors.axis} tick={{ fontSize: 12 }} tickFormatter={(value: number) => `${value}%`} domain={[0, 100]} />
            <Tooltip formatter={(value) => [`${value}%`, 'Utilization']} labelFormatter={(label) => formatDayFull(String(label))} contentStyle={{ borderRadius: 8, borderColor: colors.grid }} />
            <Area type="monotone" dataKey="utilizationPercentage" stroke={colors.primary} strokeWidth={2} fill={colors.primary} fillOpacity={0.14} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <button type="button" className="mv-quiet-button" onClick={() => setTableOpen(true)}>View data</button>
      {tableOpen && (
        <div className="mv-dialog-backdrop" onClick={() => setTableOpen(false)}>
          <section className="mv-dialog" role="dialog" aria-modal="true" aria-label="Reservation utilization data" onClick={(event) => event.stopPropagation()}>
            <div className="mv-panel-header">
              <h2 className="mv-panel-title">Reservation Utilization (Daily)</h2>
              <button type="button" className="mv-icon-button" aria-label="Close data table" onClick={() => setTableOpen(false)}>×</button>
            </div>
            <div className="mv-table-wrap">
              <table className="mv-table">
                <thead><tr><th>Date</th><th className="mv-num">Utilization</th></tr></thead>
                <tbody>
                  {data.map((point) => (
                    <tr key={point.usageDate}>
                      <td>{formatDayFull(point.usageDate)}</td>
                      <td className="mv-num">{point.utilizationPercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function formatBillingPeriod(billingPeriod: string, invoiceDate: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(billingPeriod);
  if (match) {
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    return new Date(year, monthIndex, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  return new Date(invoiceDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function InvoicesTable({ invoices }: { invoices: AzureInvoice[] }) {
  if (invoices.length === 0) {
    return <p className="mv-muted">No invoices available.</p>;
  }

  return (
    <div className="mv-table-wrap">
      <table className="mv-table">
        <thead>
          <tr>
            <th>Billing Period</th>
            <th>Invoice</th>
            <th className="mv-num">Amount</th>
            <th>Download</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.name}>
              <td>{formatBillingPeriod(invoice.billingPeriod, invoice.invoiceDate)}</td>
              <td className="mv-code">{invoice.name}</td>
              <td className="mv-num">{formatCurrency(invoice.totalAmount.amount)}</td>
              <td>
                {invoice.downloadUrl ? (
                  <a className="mv-quiet-button" href={invoice.downloadUrl} download target="_blank" rel="noreferrer">Download ↓</a>
                ) : (
                  <span className="mv-muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
