import type { NewPlanChangeRequest, PlanChangeRequest } from '../contracts/subscription';

/**
 * Plan-change requests. PROTOTYPE: recorded in memory only (nothing is sent to Maitsys); swap the
 * body for a POST through ./rest when the endpoint exists. A request never changes the plan,
 * modules or seat limits: Maitsys does that in the Super Admin portal.
 */
let requests: PlanChangeRequest[] = [];
let next = 1;

export const subscriptionRepository = {
  listPlanRequests(): PlanChangeRequest[] {
    return structuredClone(requests);
  },

  /** Records a request. Asking again for a plan that is already requested returns the existing request. */
  requestPlanChange(input: NewPlanChangeRequest): PlanChangeRequest {
    const existing = requests.find((r) => r.planId === input.planId);
    if (existing) return structuredClone(existing);
    const request: PlanChangeRequest = {
      id: `plan-request-${next++}`,
      planId: input.planId,
      requestedBy: input.requestedBy,
      note: (input.note ?? '').trim(),
      requestedAt: new Date().toISOString(),
    };
    requests = [...requests, request];
    return structuredClone(request);
  },

  reset(): void {
    requests = [];
    next = 1;
  },
};
