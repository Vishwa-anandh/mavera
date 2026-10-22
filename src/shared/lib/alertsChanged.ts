import { useSyncExternalStore } from 'react';

/**
 * The alert stores (cloud Smart Alerts, SAP alerts) live in memory and cannot tell the screen they changed. Whoever
 * changes an alert away from its own page (the dashboard's Resolve and Ignore) calls `notifyAlertsChanged`, and
 * anything that shows alerts (the dashboard, the bell) re-reads when `useAlertsVersion` moves.
 */
let version = 0;
const listeners = new Set<() => void>();

export function notifyAlertsChanged(): void {
  version += 1;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

/** A number that goes up every time an alert changed somewhere; use it as a dependency to re-read the stores. */
export function useAlertsVersion(): number {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}
