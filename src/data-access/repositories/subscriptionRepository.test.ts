import { beforeEach, describe, expect, it } from 'vitest';
import { subscriptionRepository } from './subscriptionRepository';

describe('subscriptionRepository', () => {
  beforeEach(() => subscriptionRepository.reset());

  it('records a plan request with who asked, when, and the note', () => {
    const request = subscriptionRepository.requestPlanChange({ planId: 'premium', requestedBy: 'member@acme.com', note: '  Need GCP  ' });
    expect(request).toMatchObject({ planId: 'premium', requestedBy: 'member@acme.com', note: 'Need GCP' });
    expect(Number.isNaN(Date.parse(request.requestedAt))).toBe(false);
    expect(subscriptionRepository.listPlanRequests()).toEqual([request]);
  });

  it('asking again for the same plan returns the existing request instead of adding another', () => {
    const first = subscriptionRepository.requestPlanChange({ planId: 'enterprise', requestedBy: 'a@x.com' });
    const second = subscriptionRepository.requestPlanChange({ planId: 'enterprise', requestedBy: 'b@x.com' });
    expect(second.id).toBe(first.id);
    expect(subscriptionRepository.listPlanRequests()).toHaveLength(1);
  });

  it('returns copies', () => {
    subscriptionRepository.requestPlanChange({ planId: 'premium', requestedBy: 'a@x.com' });
    subscriptionRepository.listPlanRequests()[0].note = 'tampered';
    expect(subscriptionRepository.listPlanRequests()[0].note).toBe('');
  });
});
