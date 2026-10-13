import type { CloudProvider } from '../../../shared/types/auth';

/** Field names mirror the reference CCM app's real `/budgets` endpoints
 * (`GET/POST/DELETE /budgets` via budgetApi.js). */
export interface Budget {
  id: string;
  name: string;
  target_amount: number;
  alert_threshold: number;
  scope_type: 'organization' | 'account';
  /** A cloud account id — only meaningful when `scope_type === 'account'`. */
  scope_value: string;
}

export type IntegrationProvider = 'email' | 'teams';
export type AlertScope = 'global' | 'budget_specific';

/** Field names mirror the reference's `/integrations` endpoints
 * (integrationApi.js). */
export interface AlertIntegration {
  id: string;
  provider: IntegrationProvider;
  webhook_url: string;
  email_addresses: string;
  alert_scope: AlertScope;
  budget_id: string;
}

/** A cloud account across all 4 providers, flattened for the budget-scope
 * picker — mirrors the reference's own inline mapping of
 * `/aws/accounts` + `/azure/accounts` + `/btp/accounts` + `/gcp/accounts`
 * into one list. */
export interface CloudAccountOption {
  id: string;
  name: string;
  provider: CloudProvider;
}
