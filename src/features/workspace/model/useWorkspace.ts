import { useMemo, useSyncExternalStore } from 'react';
import { workspaceRepository, type OnboardingState, type WorkspaceAccountsByProvider, type WorkspaceProvider } from '../../../data-access';

/** Re-renders the caller whenever the organisation's connected accounts (or the active profile) change. */
export function useWorkspaceVersion(): number {
  return useSyncExternalStore(workspaceRepository.subscribe, workspaceRepository.getVersion, workspaceRepository.getVersion);
}

/** The connected accounts of one provider, live. The array changes identity only when the workspace does. */
export function useWorkspaceAccounts<P extends WorkspaceProvider>(provider: P): WorkspaceAccountsByProvider[P] {
  const version = useWorkspaceVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the change signal for the repository read
  return useMemo(() => workspaceRepository.listAccounts(provider), [provider, version]);
}

/** The providers with at least one connected account, live. */
export function useConnectedProviders(): WorkspaceProvider[] {
  const version = useWorkspaceVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the change signal for the repository read
  return useMemo(() => workspaceRepository.connectedProviders(), [version]);
}

/** Total connected cloud accounts across the four providers, live. */
export function useConnectedAccountCount(): number {
  const version = useWorkspaceVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the change signal for the repository read
  return useMemo(() => workspaceRepository.accountCount(), [version]);
}

/** True when any connected account is running on the provider's sample dataset ("Sample data"). */
export function useHasSampleAccounts(): boolean {
  const version = useWorkspaceVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the change signal for the repository read
  return useMemo(() => workspaceRepository.hasSampleAccounts(), [version]);
}

/** The getting-started checklist, derived from the stores on every render (never stored, so it cannot drift). */
export function useOnboarding(): OnboardingState {
  useWorkspaceVersion();
  return workspaceRepository.onboarding();
}
