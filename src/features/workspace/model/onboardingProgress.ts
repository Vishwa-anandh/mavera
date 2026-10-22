import type { OnboardingState, OnboardingStep } from '../../../data-access';

export interface OnboardingModules {
  cloudCost: boolean;
  sapMonitoring: boolean;
}

/** The getting-started checklist as one organisation sees it: only the steps of the modules it subscribes to. */
export interface OnboardingProgress {
  steps: OnboardingStep[];
  doneCount: number;
  total: number;
  remaining: number;
  /** The person closed the checklist; it can be reopened from the assistant or the profile menu. */
  dismissed: boolean;
  /**
   * Worth showing: something is left, and either a real setup step (connect, budget, recipients, teammate) is
   * still open or the organisation is brand-new. A populated demo organisation whose only open step is the tour
   * is left alone.
   */
  relevant: boolean;
}

/** Pure: the repository's checklist narrowed to the subscribed modules. */
export function onboardingProgressOf(state: OnboardingState, modules: OnboardingModules, brandNew: boolean): OnboardingProgress {
  const steps = state.steps.filter((step) => !step.module || modules[step.module]);
  const doneCount = steps.filter((step) => step.done).length;
  const remaining = steps.length - doneCount;
  const setupOpen = steps.some((step) => step.id !== 'tour' && !step.done);
  return { steps, doneCount, total: steps.length, remaining, dismissed: state.dismissed, relevant: remaining > 0 && (setupOpen || brandNew) };
}
