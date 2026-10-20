import { useCallback, useEffect, useRef, useState } from 'react';
import type { CloudProviderId } from '../../../data-access';
import { derivePermissions } from '../../../shared/lib/permissions';
import { fireToast } from '../../../shared/lib/toastEvents';
import { oneOf, useRememberedState } from '../../../shared/lib/useRememberedState';
import { useAuth } from '../../auth';
import type { ProviderFilter } from './recommendationsDerivations';
import { recalcFactor } from './savingsInsights';

/** How long the simulated recalculation takes, so the progress state is visible. */
export const RECALCULATION_MS = 1200;

export interface SavingsRecalculation {
  /** How many times savings were recalculated this session. */
  count: number;
  /** The nudge applied to optimisation estimates; 1 until the first recalculation. */
  factor: number;
  running: boolean;
  /** When savings were last calculated (page load, then each recalculation). */
  lastAt: Date;
  start: () => void;
}

export interface SavingsScope {
  provider: ProviderFilter;
  setProvider: (provider: ProviderFilter) => void;
  /** The filter options this person may use: "All" plus every provider they can view. */
  providerOptions: ProviderFilter[];
  /** Providers whose figures this person may see; everything on the page is limited to these. */
  allowedProviders: CloudProviderId[];
  hasAnyAccess: boolean;
  /** The plan includes the savings overview. */
  overviewEnabled: boolean;
  recalculation: SavingsRecalculation;
}

/**
 * The scope shared by everything on the Savings & Optimization page: which provider is selected
 * (remembered), which providers the signed-in person may see, and the simulated "Recalculate
 * savings" run. The page owns it so the overview and the opportunity list always agree.
 */
export function useSavingsScope(): SavingsScope {
  const { user, cloudAccess, invoiceOnly, features } = useAuth();
  const permissions = derivePermissions(user, cloudAccess, invoiceOnly);
  const providers: CloudProviderId[] = ['azure', 'aws', 'btp', 'gcp'];
  // The person must be allowed to view the provider AND the organisation must be subscribed to it.
  const allowedProviders = providers.filter((p) => permissions[p].canView && permissions[p].orgHasAccess);

  const [stored, setProvider] = useRememberedState<ProviderFilter>('cloud', 'recommendations-provider', '', oneOf(['', 'azure', 'aws', 'btp', 'gcp']));
  const provider: ProviderFilter = stored === '' || allowedProviders.includes(stored) ? stored : '';

  const [count, setCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [lastAt, setLastAt] = useState(() => new Date());
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const start = useCallback(() => {
    if (timer.current !== undefined && running) return;
    setRunning(true);
    timer.current = window.setTimeout(() => {
      setCount((c) => c + 1);
      setLastAt(new Date());
      setRunning(false);
      fireToast({ type: 'success', message: 'Savings recalculated.' });
    }, RECALCULATION_MS);
  }, [running]);

  return {
    provider,
    setProvider,
    providerOptions: ['', ...allowedProviders],
    allowedProviders,
    hasAnyAccess: allowedProviders.length > 0,
    overviewEnabled: Boolean(features.recommendations),
    recalculation: { count, factor: recalcFactor(count), running, lastAt, start },
  };
}
