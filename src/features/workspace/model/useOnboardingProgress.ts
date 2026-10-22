import { useNavigate } from 'react-router-dom';
import { isEmptyWorkspace, workspaceRepository } from '../../../data-access';
import { onboardingProgressOf, type OnboardingModules, type OnboardingProgress } from './onboardingProgress';
import { useOnboarding } from './useWorkspace';

/** The getting-started checklist for the modules the organisation subscribes to, live. */
export function useOnboardingProgress(modules: OnboardingModules): OnboardingProgress {
  const state = useOnboarding();
  return onboardingProgressOf(state, modules, isEmptyWorkspace());
}

/** Reopens the getting-started checklist: un-hides it and goes to the dashboard, where it lives. */
export function useShowChecklist(): () => void {
  const navigate = useNavigate();
  return () => {
    workspaceRepository.dismissOnboarding(false);
    navigate('/');
  };
}
