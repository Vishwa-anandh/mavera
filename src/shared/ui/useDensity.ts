import { useSyncExternalStore } from 'react';

export type Density = 'comfortable' | 'compact';

const STORAGE_KEY = 'mv-density';
const listeners = new Set<() => void>();

function read(): Density {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'compact' ? 'compact' : 'comfortable';
  } catch {
    return 'comfortable';
  }
}

let current: Density = read();
if (typeof document !== 'undefined') document.documentElement.dataset.density = current;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Table row density, shared by every table and remembered across visits. */
export function setDensity(next: Density): void {
  current = next;
  if (typeof document !== 'undefined') document.documentElement.dataset.density = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // The preference just isn't remembered.
  }
  listeners.forEach((listener) => listener());
}

export function useDensity(): [Density, (next: Density) => void] {
  const density = useSyncExternalStore(subscribe, () => current, () => 'comfortable' as Density);
  return [density, setDensity];
}
