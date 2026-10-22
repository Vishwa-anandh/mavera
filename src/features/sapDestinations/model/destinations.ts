import type { SapConnectionType, SapDestination, SapDestinationInput } from '../../../data-access';

export const TIMEZONES = ['UTC — UTC+0', 'IST — UTC+5:30', 'CET — UTC+1', 'EST — UTC-5'];

export const CONNECTION_STRATEGIES: Array<{ key: SapConnectionType; label: string; help: string }> = [
  { key: 'ODATA', label: 'OData', help: 'SAP NetWeaver Gateway / S/4HANA OData services' },
  { key: 'RFC', label: 'RFC', help: 'Classic SAP RFC / BAPI connectivity' },
  { key: 'BTP_API', label: 'BTP API', help: 'SAP BTP Cloud Foundry destination API' },
];

/** The form's text fields, before they become a destination. */
export interface DestinationDraft {
  name: string;
  systems: string;
  timezone: string;
  connectionType: SapConnectionType;
  url: string;
  client: string;
  language: string;
  username: string;
}

export type DestinationErrors = Partial<Record<'name' | 'systems' | 'url', string>>;

/** "grc, GRQ  msq" becomes ["GRC", "GRQ", "MSQ"]: upper-cased, de-duplicated, order kept. */
export function parseSystems(text: string): string[] {
  return [...new Set(text.split(/[\s,;]+/).filter(Boolean).map((s) => s.toUpperCase()))];
}

export const emptyDraft = (): DestinationDraft => ({ name: '', systems: '', timezone: TIMEZONES[0], connectionType: 'ODATA', url: '', client: '', language: '', username: '' });

export const draftFromDestination = (d: SapDestination): DestinationDraft => ({
  name: d.name, systems: d.systems.join(', '), timezone: d.timezone, connectionType: d.connectionType, url: d.url, client: d.client, language: d.language, username: d.username,
});

export function toInput(draft: DestinationDraft): SapDestinationInput {
  return { ...draft, systems: parseSystems(draft.systems), name: draft.name.trim(), url: draft.url.trim() };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Field errors for the add/edit form; an empty object means it can be saved. `editingId` exempts the destination being edited from the duplicate-name check. */
export function validateDestination(draft: DestinationDraft, existing: SapDestination[], editingId?: string): DestinationErrors {
  const errors: DestinationErrors = {};
  const name = draft.name.trim();
  if (!name) errors.name = 'Enter an environment name.';
  else if (existing.some((d) => d.id !== editingId && d.name.toLowerCase() === name.toLowerCase())) errors.name = 'A destination with this name already exists.';
  if (parseSystems(draft.systems).length === 0) errors.systems = 'Enter at least one SID.';
  const url = draft.url.trim();
  if (!url) errors.url = 'Enter the gateway URL.';
  else if (!isHttpUrl(url)) errors.url = 'Enter a full URL starting with https:// or http://.';
  return errors;
}

export function filterDestinations(destinations: SapDestination[], query: string): SapDestination[] {
  const q = query.trim().toLowerCase();
  return q ? destinations.filter((d) => `${d.name} ${d.url}`.toLowerCase().includes(q)) : destinations;
}
