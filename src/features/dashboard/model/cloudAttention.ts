import { useMemo } from 'react';
import { cloudInsightsRepository } from '../../../data-access';
import { useOpenHighImpactCount } from '../../../shared/lib/opportunityStore';

export interface CloudAttentionSources {
  highImpactSavings: number;
  /** Reservations ending within `withinDays`, soonest first. `daysLeft` is whole days from `now`. */
  expiringReservations: Array<{ name: string; daysLeft: number }>;
}

/** Cloud facts the dashboard's "Needs attention" list draws on, read through the repository. */
export function useCloudAttentionSources(now: Date = new Date(), withinDays = 30): CloudAttentionSources {
  const opportunities = useMemo(() => cloudInsightsRepository.listOptimizationOpportunities(), []);
  const reservations = useMemo(() => cloudInsightsRepository.listReservations(), []);
  const highImpactSavings = useOpenHighImpactCount(opportunities);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const expiringReservations = reservations
    .map((r) => ({ name: r.name, daysLeft: Math.round((new Date(`${r.end}T00:00:00`).getTime() - today) / 86_400_000) }))
    .filter((r) => r.daysLeft >= 0 && r.daysLeft <= withinDays)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  return { highImpactSavings, expiringReservations };
}
