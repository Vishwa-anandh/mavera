import { useSyncExternalStore } from 'react';
import type { ConnectedAccount } from './connectAccount';
import type { ConnectProvider } from './connectProviders';

export interface ConnectDialogOptions {
  /** Called once the account is connected and the dialog has closed. */
  onConnected?: (account: ConnectedAccount) => void;
  /** Stay on the current page after connecting instead of opening the new account's page. */
  stay?: boolean;
  /** With a provider: let the user pick a different one from the credentials step ("Connect something else"). */
  canSwitch?: boolean;
}

export interface ConnectDialogRequest extends ConnectDialogOptions {
  /** Absent: launched generically, so the dialog opens on the provider picker. */
  provider?: ConnectProvider;
}

/**
 * Whether the shared connect dialog is open and what it was asked for. Module-level on purpose: any screen (an empty
 * state, the command palette, a dashboard card, a deep link) can open it with `openConnectDialog()` without
 * threading a provider through the tree; `ConnectDialogHost`, mounted once in the app shell, shows it.
 */
let request: ConnectDialogRequest | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const getSnapshot = () => request;

/** Opens the connect dialog: on that provider's credentials, or on the provider picker when none is given. */
export function openConnectDialog(provider?: ConnectProvider, options: ConnectDialogOptions = {}): void {
  request = { provider, ...options };
  emit();
}

export function closeConnectDialog(): void {
  if (!request) return;
  request = null;
  emit();
}

/** The open request, live: what `ConnectDialogHost` renders. */
export function useConnectDialogRequest(): ConnectDialogRequest | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

const API = { openConnectDialog, closeConnectDialog } as const;

/** Open or close the shared connect dialog from anywhere. The returned functions never change identity. */
export function useConnectDialog(): typeof API {
  return API;
}
