import type { ReactNode } from 'react';
import type { IdocRecord } from '../../../data-access';
import { Select } from '../../../shared/ui/Select';
import { SearchIcon } from '../../../shared/ui/icons';
import type { useIdocFilters } from '../model/idocFilters';

const ALL = 'All';

interface IdocFilterBarProps {
  records: IdocRecord[];
  filters: ReturnType<typeof useIdocFilters>;
  /** Hide the direction select on pages that already split by direction. */
  showDirection?: boolean;
  children?: ReactNode;
}

export function IdocFilterBar({ records, filters, showDirection = true, children }: IdocFilterBarProps) {
  const { values, setters, clear, active } = filters;
  const unique = (pick: (r: IdocRecord) => string) => [...new Set(records.map(pick))].sort();
  return (
    <div className="mv-filter-bar" role="search" aria-label="Filter IDocs">
      <label className="mv-filter-search">
        <SearchIcon size={16} aria-hidden />
        <input
          aria-label="Search IDoc number, partner or message type"
          placeholder="IDoc number, partner, message type…"
          value={values.search}
          onChange={(event) => setters.setSearch(event.target.value)}
        />
      </label>
      <Select label="Partner" hideLabel value={values.partner} onChange={setters.setPartner} options={[{ value: ALL, label: 'All partners' }, ...unique((r) => r.partner).map((p) => ({ value: p, label: p }))]} />
      <Select label="Message type" hideLabel value={values.messageType} onChange={setters.setMessageType} options={[{ value: ALL, label: 'All message types' }, ...unique((r) => r.messageType).map((m) => ({ value: m, label: m }))]} />
      {showDirection && (
        <Select label="Direction" hideLabel value={values.direction} onChange={setters.setDirection} options={[{ value: ALL, label: 'Both directions' }, { value: 'Inbound', label: 'Inbound' }, { value: 'Outbound', label: 'Outbound' }]} />
      )}
      {children}
      {active && <button type="button" className="mv-quiet-button" onClick={clear}>Clear filters</button>}
    </div>
  );
}
