export type PlanId = 'free' | 'premium' | 'enterprise';

/**
 * A request to move the organisation to another plan. It only tells Maitsys what the organisation
 * wants; the plan, modules and seat limits are changed by Maitsys in the Super Admin portal.
 */
export interface PlanChangeRequest {
  id: string;
  planId: PlanId;
  /** E-mail of the member who asked. */
  requestedBy: string;
  note: string;
  /** ISO timestamp. */
  requestedAt: string;
}

export type NewPlanChangeRequest = Pick<PlanChangeRequest, 'planId' | 'requestedBy'> & { note?: string };
