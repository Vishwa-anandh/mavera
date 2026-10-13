import { Select } from '../../../shared/ui/Select';
import { oneOf, useRememberedState } from '../../../shared/lib/useRememberedState';

const DESTINATIONS = ['GRC', 'MSQ', 'GRQ', 'EMP'] as const;

/**
 * Picks which connected SAP destination this page's data is scoped to. A
 * prototype simplification: switching destinations doesn't change the mock
 * data underneath (no per-destination datasets exist yet) — same honest
 * "presentational only" treatment as other static prototype bits. The choice
 * is remembered for the session and shared by every SAP Monitoring page, so
 * moving between SAP pages keeps the same system selected; it never carries
 * into Cloud Cost or IDoc Monitoring (MAVERA_DESIGN_SYSTEM.md §6.2).
 */
export function DestinationSwitcher() {
  const [value, setValue] = useRememberedState<(typeof DESTINATIONS)[number]>('sap', 'destination', 'GRC', oneOf(DESTINATIONS));
  return (
    <Select
      label="Destination"
      hideLabel
      value={value}
      onChange={setValue}
      options={DESTINATIONS.map((d) => ({ value: d, label: d }))}
      style={{ width: 130 }}
    />
  );
}
