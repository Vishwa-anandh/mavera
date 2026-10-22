import { describe, expect, it } from 'vitest';
import type { OnboardingStep } from '../../../data-access';
import { deriveSetup, minutesLabel } from './setupSteps';
import { shouldOpenSetupOnSignIn } from './setupMemory';

const checklist = (done: Array<OnboardingStep['id']>): OnboardingStep[] =>
  (['cloud', 'sap', 'budget', 'alerts', 'teammate', 'tour'] as const).map((id) => ({ id, label: id, done: done.includes(id) }));
const ALL = { cloudCost: true, sapMonitoring: true };

describe('deriveSetup', () => {
  it('groups the steps under Platform, Cloud Cost, SAP Monitoring and Finish', () => {
    const model = deriveSetup({ checklist: checklist([]), profileSaved: false, modules: ALL });
    expect(model.groups.map((g) => [g.label, g.steps.map((s) => s.id)])).toEqual([
      ['Platform', ['profile', 'invite', 'notifications']],
      ['Cloud Cost', ['cloud', 'budget']],
      ['SAP Monitoring', ['sap']],
      ['Finish', ['review']],
    ]);
    expect(model.steps.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('derives completion from the stores and progress from the count', () => {
    const model = deriveSetup({ checklist: checklist(['cloud', 'teammate', 'tour']), profileSaved: true, modules: ALL });
    expect(model.steps.filter((s) => s.complete).map((s) => s.id)).toEqual(['profile', 'invite', 'cloud']);
    expect(model).toMatchObject({ total: 6, done: 3, percent: 50, minutesLeft: 3 });
  });

  it('completes the review only when everything else is done', () => {
    expect(deriveSetup({ checklist: checklist(['cloud', 'sap', 'budget', 'alerts', 'teammate']), profileSaved: true, modules: ALL }).steps.at(-1)).toMatchObject({ id: 'review', complete: true });
    expect(deriveSetup({ checklist: checklist([]), profileSaved: true, modules: ALL }).steps.at(-1)?.complete).toBe(false);
  });

  it('leaves out the group of a module the organisation does not subscribe to', () => {
    const cloudOnly = deriveSetup({ checklist: checklist([]), profileSaved: false, modules: { cloudCost: true, sapMonitoring: false } });
    expect(cloudOnly.groups.map((g) => g.label)).toEqual(['Platform', 'Cloud Cost', 'Finish']);
    expect(cloudOnly.total).toBe(5);
    const sapOnly = deriveSetup({ checklist: checklist([]), profileSaved: false, modules: { cloudCost: false, sapMonitoring: true } });
    expect(sapOnly.groups.map((g) => g.label)).toEqual(['Platform', 'SAP Monitoring', 'Finish']);
    expect(sapOnly.steps.map((s) => s.number)).toEqual([1, 2, 3, 4, 5]);
  });

  it('words the time left', () => {
    expect(minutesLabel(4)).toBe('~4 min left');
    expect(minutesLabel(0)).toBe('All done');
  });
});

describe('shouldOpenSetupOnSignIn', () => {
  const base = { memory: { redirected: false, skipped: false, visited: [] }, brandNew: true, canSetup: true, somethingLeft: true };
  it('sends a brand-new organisation owner once', () => {
    expect(shouldOpenSetupOnSignIn(base)).toBe(true);
    expect(shouldOpenSetupOnSignIn({ ...base, memory: { ...base.memory, redirected: true } })).toBe(false);
    expect(shouldOpenSetupOnSignIn({ ...base, memory: { ...base.memory, skipped: true } })).toBe(false);
  });
  it('leaves populated organisations, other roles and finished setups alone', () => {
    expect(shouldOpenSetupOnSignIn({ ...base, brandNew: false })).toBe(false);
    expect(shouldOpenSetupOnSignIn({ ...base, canSetup: false })).toBe(false);
    expect(shouldOpenSetupOnSignIn({ ...base, somethingLeft: false })).toBe(false);
  });
});
