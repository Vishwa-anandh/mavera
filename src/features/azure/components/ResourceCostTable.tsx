import { useState } from 'react';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { isSubscriptionWide } from '../model/azureDerivations';
import type { AzureResourceItem } from '../model/azureTypes';

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

/** How many resources are listed before "Show all". */
export const RESOURCES_COLLAPSED = 8;

/**
 * Every resource in the subscription, most expensive first: # / Resource / Service / Cost / CSP Savings. Only the
 * top few rows show until "Show all N resources" is pressed, so the Executive view stays short. Resources that
 * cost nothing are listed too (they are the unused ones); the page grows instead of scrolling inside the table.
 */
export function ResourceCostTable({ resources, mspRate }: { resources: AzureResourceItem[]; mspRate: number }) {
  const [showAll, setShowAll] = useState(false);

  if (resources.length === 0) return <p className="mv-muted">No resources are listed for this subscription.</p>;

  const sorted = [...resources].sort((a, b) => b.cost - a.cost || a.name.localeCompare(b.name));
  const visible = showAll ? sorted : sorted.slice(0, RESOURCES_COLLAPSED);
  const label = `CSP Savings (${(mspRate * 100).toFixed(0)}%)`;

  return (
    <>
      <div className="mv-table-wrap">
        <table className="mv-table mv-table--stack">
          <caption className="mv-sr-only">Resources by month-to-date cost, with the estimated Maitsys CSP saving for each.</caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Resource</th>
              <th scope="col">Service</th>
              <th scope="col" className="mv-num">Cost</th>
              <th scope="col" className="mv-num">{label}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((resource, index) => (
              <tr key={resource.id}>
                <td data-label="#" className="mv-muted mv-stack-index">{String(index + 1).padStart(2, '0')}</td>
                <Tooltip content={resource.id}><td data-label="Resource" className="mv-stack-title mv-wrap-anywhere">{isSubscriptionWide(resource.id) ? 'Subscription-wide' : resource.name}</td></Tooltip>
                <td data-label="Service">{resource.type}</td>
                <td data-label="Cost" className="mv-num">{money(resource.cost)}</td>
                <td data-label={label} className="mv-num" style={resource.cost > 0 ? { color: 'var(--mv-success)' } : undefined}>{money(resource.cost * mspRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > RESOURCES_COLLAPSED && (
        <button type="button" className="mv-quiet-button mv-show-all" aria-expanded={showAll} onClick={() => setShowAll((value) => !value)}>
          {showAll ? 'Show fewer resources' : `Show all ${sorted.length} resources`}
        </button>
      )}
    </>
  );
}
