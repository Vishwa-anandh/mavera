/* Public API of the sapDestinations feature: the SAP destination form model (draft, parsing, validation) shared by System Configuration (add, edit) and the shared connect dialog. */
export {
  CONNECTION_STRATEGIES, TIMEZONES, draftFromDestination, emptyDraft, filterDestinations, parseSystems, toInput, validateDestination,
} from './model/destinations';
export type { DestinationDraft, DestinationErrors } from './model/destinations';
