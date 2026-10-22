import { Tooltip } from '../../../shared/ui/Tooltip';

/**
 * Marks figures that come from the provider's sample dataset rather than a live feed, so nobody mistakes a
 * freshly connected demo account's numbers for real spend.
 */
export function SampleDataBadge({ className = '' }: { className?: string }) {
  return (
    <Tooltip content="This prototype has no live connection: the figures are the provider's sample dataset, shown under your account name.">
      <span className={`mv-status mv-status--neutral mv-sample-badge ${className}`.trim()}>Sample data</span>
    </Tooltip>
  );
}
