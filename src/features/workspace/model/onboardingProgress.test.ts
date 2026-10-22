import { describe, it, expect } from 'vitest';
import type { OnboardingState, OnboardingStepId } from '../../../data-access';
import { onboardingProgressOf } from './onboardingProgress';

const IDS: OnboardingStepId[] = ['cloud', 'sap', 'budget', 'alerts', 'teammate', 'tour'];
const MODULE = { cloud: 'cloudCost', sap: 'sapMonitoring', budget: 'cloudCost' } as const;

function state(done: OnboardingStepId[], dismissed = false): OnboardingState {
  return {
    steps: IDS.map((id) => ({ id, label: id, done: done.includes(id), module: MODULE[id as keyof typeof MODULE] })),
    doneCount: done.length,
    dismissed,
    tourDone: done.includes('tour'),
  };
}
const ALL = { cloudCost: true, sapMonitoring: true };

describe('onboardingProgressOf', () => {
  it('counts every step for an organisation with both modules', () => {
    expect(onboardingProgressOf(state(['cloud']), ALL, true)).toMatchObject({ doneCount: 1, total: 6, remaining: 5, relevant: true, dismissed: false });
  });

  it('leaves out the steps of a module the organisation lacks, and counts progress against the rest', () => {
    const p = onboardingProgressOf(state(['cloud', 'budget']), { cloudCost: true, sapMonitoring: false }, true);
    expect(p.steps.map((s) => s.id)).toEqual(['cloud', 'budget', 'alerts', 'teammate', 'tour']);
    expect(p).toMatchObject({ doneCount: 2, total: 5 });
    const sapOnly = onboardingProgressOf(state([]), { cloudCost: false, sapMonitoring: true }, true);
    expect(sapOnly.steps.map((s) => s.id)).toEqual(['sap', 'alerts', 'teammate', 'tour']);
  });

  it('is relevant for a brand-new organisation until everything is done', () => {
    expect(onboardingProgressOf(state(IDS), ALL, true).relevant).toBe(false);
    expect(onboardingProgressOf(state(IDS.slice(0, 5)), ALL, true).relevant).toBe(true);
  });

  it('is not relevant when only the tour is left on an organisation that is not new', () => {
    const noTour = IDS.filter((id) => id !== 'tour');
    expect(onboardingProgressOf(state(noTour), ALL, false).relevant).toBe(false);
    expect(onboardingProgressOf(state(noTour), ALL, true).relevant).toBe(true);
    expect(onboardingProgressOf(state(['cloud', 'tour']), ALL, false).relevant).toBe(true);
  });

  it('carries the dismissed flag through', () => {
    expect(onboardingProgressOf(state([], true), ALL, true).dismissed).toBe(true);
  });
});
