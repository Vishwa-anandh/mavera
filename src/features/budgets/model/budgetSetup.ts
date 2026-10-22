import { budgetsRepository, type AlertChannel, type Budget } from '../../../data-access';
import { addRecipients } from './budgetChannels';

export interface NewOrganisationBudget {
  name: string;
  amount: number;
  /** Percent of the limit at which the alert fires. */
  threshold: number;
}

export const DEFAULT_ALERT_THRESHOLD = 80;

/** Why a first-budget form cannot be saved, per field; empty when it can. */
export function validateOrganisationBudget(input: { name: string; amount: string; threshold: string }, existingNames: string[]): Partial<Record<'name' | 'amount' | 'threshold', string>> {
  const errors: Partial<Record<'name' | 'amount' | 'threshold', string>> = {};
  const name = input.name.trim();
  if (!name) errors.name = 'Give the budget a name.';
  else if (existingNames.some((existing) => existing.trim().toLowerCase() === name.toLowerCase())) errors.name = 'A budget with this name already exists.';
  const amount = Number(input.amount);
  if (!input.amount.trim() || !Number.isFinite(amount) || amount <= 0) errors.amount = 'Enter a monthly limit above zero.';
  const threshold = Number(input.threshold);
  if (!Number.isFinite(threshold) || threshold < 1 || threshold > 100) errors.threshold = 'Enter a percentage from 1 to 100.';
  return errors;
}

/** Creates an organisation-wide budget (the shape the Budgets page creates by default). */
export function createOrganisationBudget(input: NewOrganisationBudget): Budget {
  return budgetsRepository.createBudget({
    name: input.name.trim(),
    target_amount: input.amount,
    alert_threshold: input.threshold,
    scope_type: 'organization',
    scope_value: '',
  });
}

/** Adds a global e-mail channel for the addresses: budget alerts for every budget go to them. */
export function addEmailAlertChannel(emails: string[]): AlertChannel {
  const clean = addRecipients([], emails.join(' ')).emails;
  return budgetsRepository.addChannel({ provider: 'email', alert_scope: 'global', budget_ids: [], email_addresses: clean, webhook_url: '' });
}
