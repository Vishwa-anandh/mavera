import { useState, type FormEvent } from 'react';
import { budgetsRepository } from '../../../../data-access';
import { fireToast } from '../../../../shared/lib/toastEvents';
import { CheckIcon } from '../../../../shared/ui/icons';
import { DEFAULT_ALERT_THRESHOLD, createOrganisationBudget, useBudgetSuggestion, validateOrganisationBudget } from '../../../budgets';
import { useContinueHandler, type RegisterContinue } from '../../model/useContinueHandler';
import { FormCard, SetupField } from '../FormCard';

interface BudgetStepProps {
  register: RegisterContinue;
  onChanged: () => void;
  /** Opens another step (the cloud step, when there is no spend to suggest a limit from). */
  openStep: (id: 'cloud') => void;
}

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

/** Step 5: the first monthly budget, pre-filled from the spend the connected accounts show (the budgets feature's suggestion). */
export function BudgetStep({ register, onChanged, openStep }: BudgetStepProps) {
  const budgets = budgetsRepository.listBudgets();
  const suggestion = useBudgetSuggestion(budgets.map((budget) => budget.name));
  const [name, setName] = useState<string | null>(null);
  const [amount, setAmount] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(String(DEFAULT_ALERT_THRESHOLD));
  const [attempted, setAttempted] = useState(false);

  // Until a field is typed in, it follows the suggestion, so a good default is already there.
  const nameValue = name ?? suggestion.name;
  const amountValue = amount ?? (suggestion.amount !== null ? String(suggestion.amount) : '');
  const errors = attempted ? validateOrganisationBudget({ name: nameValue, amount: amountValue, threshold }, budgets.map((b) => b.name)) : {};

  const create = (): boolean => {
    setAttempted(true);
    if (Object.keys(validateOrganisationBudget({ name: nameValue, amount: amountValue, threshold }, budgets.map((b) => b.name))).length > 0) return false;
    const budget = createOrganisationBudget({ name: nameValue, amount: Number(amountValue), threshold: Number(threshold) });
    setName(null);
    setAmount(null);
    setAttempted(false);
    onChanged();
    fireToast({ type: 'success', message: `${budget.name} created. You are warned at ${budget.alert_threshold}% of ${money(budget.target_amount)}.` });
    return true;
  };

  // Continue creates the suggested budget when none exists and a limit is filled in; otherwise it just moves on.
  useContinueHandler(register, () => (budgets.length === 0 && amountValue.trim() ? create() : true));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    create();
  };

  return (
    <div className="mv-setup-stack">
      <FormCard title={budgets.length === 0 ? 'Create your first budget' : 'Add another budget'} description="A monthly limit for your whole organisation. You are told when spend reaches the percentage you choose.">
        <form className="mv-setup-stack" onSubmit={submit} noValidate aria-label="New budget">
          <div className="mv-setup-grid">
            <SetupField label="Budget name" autoFocus value={nameValue} max={60} error={errors.name} onChange={setName} />
            <SetupField label="Monthly limit (USD)" value={amountValue} error={errors.amount} onChange={setAmount} placeholder="5000" help={suggestion.basis ?? undefined} />
            <SetupField label="Alert at (%)" value={threshold} error={errors.threshold} onChange={setThreshold} placeholder="80" />
          </div>
          {suggestion.amount === null && budgets.length === 0 && (
            <p className="mv-notice">No spend to suggest a limit from yet. <button type="button" className="mv-quiet-button" onClick={() => openStep('cloud')}>Connect a cloud account first</button> or type your own limit.</p>
          )}
          <div><button type="submit" className="mv-secondary-button">Create budget</button></div>
        </form>
      </FormCard>

      {budgets.length > 0 && (
        <FormCard title="Your budgets" description="Alerts for these go to the recipients you set under Notifications.">
          <ul className="mv-setup-list" aria-label="Budgets">
            {budgets.map((budget) => (
              <li key={budget.id} className="mv-setup-list-row">
                <span className="mv-setup-list-text"><strong>{budget.name}</strong><span className="mv-muted">{money(budget.target_amount)} a month, alert at {budget.alert_threshold}%</span></span>
                <span className="mv-status mv-status--success"><CheckIcon size={12} style={{ marginRight: '0.25rem' }} />Active</span>
              </li>
            ))}
          </ul>
        </FormCard>
      )}
    </div>
  );
}
