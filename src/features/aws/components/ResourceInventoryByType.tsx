import { BarList } from '../../../shared/ui/BarList';
import { resourceTypeShares } from '../model/awsDerivations';
import type { AwsResources } from '../model/awsTypes';

/**
 * Resource inventory by type: how many of each kind of resource the account holds (security groups, subnets,
 * volumes, buckets, instances, ...) with each type's share of the total, largest first.
 */
export function ResourceInventoryByType({ resources }: { resources: AwsResources }) {
  const shares = resourceTypeShares(resources.byType);

  return (
    <section className="mv-panel">
      <div className="mv-panel-header">
        <div>
          <h2 className="mv-panel-title">Resource Inventory</h2>
          <p className="mv-muted mv-section-sub">
            {resources.total.toLocaleString()} {resources.total === 1 ? 'resource' : 'resources'} across {shares.length} {shares.length === 1 ? 'type' : 'types'}.
          </p>
        </div>
      </div>
      {shares.length === 0 ? (
        <p className="mv-muted">No resources are listed for this account.</p>
      ) : (
        <div className="mv-inventory-bars">
          <BarList
            label="Resources by type"
            items={shares.map((type) => ({
              key: type.type,
              label: type.type,
              value: type.count,
              display: type.count.toLocaleString(),
              meta: `${type.sharePct.toFixed(1)}% of resources`,
            }))}
          />
        </div>
      )}
    </section>
  );
}
