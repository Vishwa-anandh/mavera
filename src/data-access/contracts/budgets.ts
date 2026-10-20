import type { CloudProviderId } from './cloud';

/** Field names mirror the reference CCM app's `/budgets` endpoints (`GET/POST/DELETE /budgets`). */
export interface Budget {
  id: string;
  name: string;
  target_amount: number;
  alert_threshold: number;
  scope_type: 'organization' | 'account';
  /** A cloud account id; only meaningful when `scope_type === 'account'`. */
  scope_value: string;
}

export type ChannelProvider = 'email' | 'teams';
/** `global` notifies for every budget; `budget_specific` only for the budgets listed in `budget_ids`. */
export type ChannelScope = 'global' | 'budget_specific';

/** A notification channel for budget alerts (the reference app's `/integrations`, extended with an on/off switch). */
export interface AlertChannel {
  id: string;
  provider: ChannelProvider;
  enabled: boolean;
  alert_scope: ChannelScope;
  /** Budgets this channel is tied to; empty for a global channel. */
  budget_ids: string[];
  /** Recipients of an email channel. */
  email_addresses: string[];
  /** Incoming-webhook URL of a Microsoft Teams channel. */
  webhook_url: string;
  /** ISO timestamp. */
  created_at: string;
}

export type NewBudget = Omit<Budget, 'id'> & {
  /** Budget-based channels that should also notify for the new budget. */
  channel_ids?: string[];
};

export type NewAlertChannel = Omit<AlertChannel, 'id' | 'created_at' | 'enabled'> & { enabled?: boolean };

/** A cloud account across the four providers, flattened for the budget-scope picker. */
export interface CloudAccountOption {
  id: string;
  name: string;
  provider: CloudProviderId;
}
