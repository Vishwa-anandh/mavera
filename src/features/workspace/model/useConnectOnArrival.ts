import { useOpenOnArrival } from '../../../shared/lib/useOpenOnArrival';
import { openConnectDialog } from './connectDialogStore';
import type { ConnectProvider } from './connectProviders';

/**
 * A page that is reached through `?open=connect` (a deep link, an old bookmark) opens the shared connect dialog on
 * its own provider's credentials, and the request is taken out of the URL. The dialog explains itself when the
 * user may not connect (read-only, account limit), so the request is never silently dropped.
 */
export function useConnectOnArrival(provider: ConnectProvider, options: { enabled?: boolean } = {}): void {
  useOpenOnArrival('connect', () => openConnectDialog(provider), options);
}
