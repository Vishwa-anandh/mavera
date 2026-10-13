import type { IdocRecord } from '../../../data-access';
import { useRememberedState } from '../../../shared/lib/useRememberedState';

export interface IdocFilterValues {
  search: string;
  partner: string;
  messageType: string;
  direction: string;
}

const ALL = 'All';

/**
 * Filters shared by the IDoc worklists, remembered per page for the session. `search` matches
 * the IDoc number (leading zeros optional), partner, message/basic type and status text.
 */
export function useIdocFilters(page: string) {
  const [search, setSearch] = useRememberedState('idoc', `${page}-search`, '');
  const [partner, setPartner] = useRememberedState('idoc', `${page}-partner`, ALL);
  const [messageType, setMessageType] = useRememberedState('idoc', `${page}-message-type`, ALL);
  const [direction, setDirection] = useRememberedState('idoc', `${page}-direction`, ALL);
  const values: IdocFilterValues = { search, partner, messageType, direction };
  const setters = { setSearch, setPartner, setMessageType, setDirection };
  const clear = () => { setSearch(''); setPartner(ALL); setMessageType(ALL); setDirection(ALL); };
  const active = Boolean(search.trim()) || partner !== ALL || messageType !== ALL || direction !== ALL;
  return { values, setters, clear, active };
}

export function applyIdocFilters(records: IdocRecord[], values: IdocFilterValues): IdocRecord[] {
  const query = values.search.trim().toLowerCase().replace(/^0+/, '');
  return records.filter((record) => {
    if (values.partner !== ALL && record.partner !== values.partner) return false;
    if (values.messageType !== ALL && record.messageType !== values.messageType) return false;
    if (values.direction !== ALL && record.direction !== values.direction) return false;
    if (!query) return true;
    const haystack = `${record.docnum.replace(/^0+/, '')} ${record.partner} ${record.messageType} ${record.basicType} ${record.statusText} ${record.statusCode}`.toLowerCase();
    return haystack.includes(query);
  });
}
