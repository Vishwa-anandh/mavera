import { useReducer, useSyncExternalStore } from 'react';
import { organisationProfileRepository, type OrganisationProfile } from '../../../data-access';
import { useAccess, useAccessDirectory } from '../../access';
import { useAuth } from '../../auth';
import { useOnboarding } from '../../workspace';
import { deriveSetup, type SetupModel } from './setupSteps';

export interface SetupState {
  model: SetupModel;
  profile: OrganisationProfile;
  /** Re-reads the stores that do not announce their own changes (budgets, alert channels). Call after writing to them. */
  refresh: () => void;
}

/** The wizard's progress, derived from the real stores on every render; nothing here is stored separately. */
export function useSetup(): SetupState {
  const { modules } = useAuth();
  const [, refresh] = useReducer((count: number) => count + 1, 0);
  const onboarding = useOnboarding();
  useAccessDirectory();
  const profile = useSyncExternalStore(organisationProfileRepository.subscribe, organisationProfileRepository.get, organisationProfileRepository.get);
  const model = deriveSetup({ checklist: onboarding.steps, profileSaved: profile.savedAt !== null, modules });
  return { model, profile, refresh };
}

/** Only an organisation's owner and administrators set it up. */
export function useCanRunSetup(): boolean {
  const { ownRoleId } = useAccess();
  return ownRoleId === 'owner' || ownRoleId === 'admin';
}
