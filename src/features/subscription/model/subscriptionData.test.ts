import { describe, expect, it } from 'vitest';
import { PLANS, planNameOf, suggestedPlan } from './subscriptionData';

describe('suggestedPlan', () => {
  it('offers the next plan up from the current one', () => {
    expect(suggestedPlan('basic', [])?.id).toBe('premium');
    expect(suggestedPlan('free', [])?.id).toBe('premium');
    expect(suggestedPlan('premium', [])?.id).toBe('enterprise');
  });

  it('skips plans that were already requested, then falls back to any other plan not yet requested', () => {
    expect(suggestedPlan('basic', ['premium'])?.id).toBe('enterprise');
    expect(suggestedPlan('premium', ['enterprise'])?.id).toBe('free');
  });

  it('offers nothing when every other plan is already requested', () => {
    expect(suggestedPlan('enterprise', ['free', 'premium'])).toBeNull();
    expect(suggestedPlan('basic', ['premium', 'enterprise'])).toBeNull();
  });

  it('never offers the current plan', () => {
    for (const plan of PLANS) expect(suggestedPlan(plan.id, [])?.id).not.toBe(plan.id);
    expect(planNameOf('basic')).toBe('Free');
  });
});
