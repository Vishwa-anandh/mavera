import { useSyncExternalStore } from 'react';

/**
 * PROTOTYPE session state for Optimization Advisor: who owns each opportunity and which were
 * dismissed (with the reason). With a backend these are API calls; nothing here changes any
 * cloud resource (CLOUD-04: never apply infrastructure changes from a ranking row).
 */
export interface OpportunityState {
  owner?: string;
  status: 'Open' | 'In review' | 'Dismissed';
  dismissReason?: string;
}

let states: Record<string, OpportunityState> = {};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useOpportunityStates(): Record<string, OpportunityState> {
  return useSyncExternalStore(subscribe, () => states);
}

export function updateOpportunity(id: string, patch: Partial<OpportunityState>): void {
  states = { ...states, [id]: { ...(states[id] ?? { status: 'Open' }), ...patch } };
  emit();
}

export function resetOpportunityStates(): void {
  states = {};
  emit();
}

/** Open or in-review High-impact opportunities, for the dashboard's attention list. Dismissed ones don't count. */
export function useOpenHighImpactCount(opportunities: Array<{ id: string; impact: string; overlapsWith?: string }>): number {
  const current = useOpportunityStates();
  const active = opportunities.filter((o) => (current[o.id]?.status ?? 'Open') !== 'Dismissed');
  return active.filter((o) => o.impact === 'High' && (!o.overlapsWith || !active.some((other) => other.id === o.overlapsWith))).length;
}
