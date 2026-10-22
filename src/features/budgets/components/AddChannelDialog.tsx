import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Select } from '../../../shared/ui/Select';
import { CloseIcon } from '../../../shared/ui/icons';
import { useModalOverlay } from '../../../shared/ui/useOverlay';
import { addRecipients, isValidEmail, teamsWebhookError } from '../model/budgetChannels';
import type { Budget, ChannelProvider, ChannelScope } from '../model/budgetsTypes';

export interface NewChannelValues {
  provider: ChannelProvider;
  alert_scope: ChannelScope;
  budget_ids: string[];
  email_addresses: string[];
  webhook_url: string;
}

interface AddChannelDialogProps {
  budgets: Budget[];
  /** The signed-in person's email: it starts as the only recipient, so adding a channel for yourself needs no typing. */
  defaultEmail?: string;
  onAdd: (values: NewChannelValues) => void;
  onClose: () => void;
}

/**
 * Add a notification channel: Email (recipients entered as chips with Enter) or Microsoft Teams
 * (a validated webhook URL), for every budget or for chosen budgets only.
 */
export function AddChannelDialog({ budgets, defaultEmail, onAdd, onClose }: AddChannelDialogProps) {
  const ref = useModalOverlay<HTMLElement>(onClose);
  const titleId = useId();
  const [provider, setProvider] = useState<ChannelProvider>('email');
  const [scope, setScope] = useState<ChannelScope>('global');
  const [budgetIds, setBudgetIds] = useState<string[]>([]);
  const [emails, setEmails] = useState<string[]>(() => (defaultEmail && isValidEmail(defaultEmail) ? [defaultEmail.trim()] : []));
  const [draft, setDraft] = useState('');
  const [webhook, setWebhook] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  /** Moves what is typed in the recipient box into the chips; returns the new list. */
  const commitDraft = (): string[] => {
    if (!draft.trim()) return emails;
    const result = addRecipients(emails, draft);
    setEmails(result.emails);
    setEmailError(result.error);
    if (!result.error) setDraft('');
    return result.emails;
  };

  const onDraftKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === ';') {
      event.preventDefault();
      commitDraft();
    } else if (event.key === 'Backspace' && !draft && emails.length > 0) {
      setEmails(emails.slice(0, -1));
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    let valid = true;
    let finalEmails = emails;
    if (provider === 'email') {
      // Whatever is still typed in the box counts as the last recipient.
      const result = draft.trim() ? addRecipients(emails, draft) : { emails, error: null };
      finalEmails = result.emails;
      setEmails(result.emails);
      if (result.error) {
        setEmailError(result.error);
        valid = false;
      } else if (result.emails.length === 0) {
        setEmailError('Add at least one email address and press Enter.');
        valid = false;
      } else {
        setDraft('');
        setEmailError(null);
      }
    } else {
      const error = teamsWebhookError(webhook);
      setWebhookError(error);
      if (error) valid = false;
    }
    if (scope === 'budget_specific' && budgetIds.length === 0) {
      setBudgetError(budgets.length === 0 ? 'There are no budgets yet. Create a budget first, or choose a global alert.' : 'Choose at least one budget.');
      valid = false;
    } else {
      setBudgetError(null);
    }
    if (!valid) return;
    onAdd({
      provider,
      alert_scope: scope,
      budget_ids: scope === 'global' ? [] : budgetIds,
      email_addresses: provider === 'email' ? finalEmails : [],
      webhook_url: provider === 'teams' ? webhook.trim() : '',
    });
  };

  const toggleBudget = (id: string) => {
    setBudgetIds((current) => (current.includes(id) ? current.filter((b) => b !== id) : [...current, id]));
    setBudgetError(null);
  };

  return (
    <div className="mv-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={ref} className="mv-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="mv-panel-header">
          <h2 id={titleId} className="mv-panel-title">Add notification channel</h2>
          <button type="button" className="mv-icon-button" aria-label="Close" onClick={onClose}><CloseIcon size={16} /></button>
        </div>
        <form onSubmit={submit} noValidate>
          <Select
            label="Provider"
            value={provider}
            onChange={(value) => { setProvider(value); setEmailError(null); setWebhookError(null); }}
            options={[{ value: 'email', label: 'Email' }, { value: 'teams', label: 'Microsoft Teams' }]}
          />
          <Select
            label="Alert scope"
            value={scope}
            onChange={(value) => { setScope(value); setBudgetError(null); }}
            options={[{ value: 'global', label: 'Global alert (all budgets)' }, { value: 'budget_specific', label: 'Budget-based alert (chosen budgets)' }]}
          />

          {scope === 'budget_specific' && (
            <fieldset className="mv-fieldset" aria-describedby={budgetError ? `${titleId}-budget-error` : undefined}>
              <legend>Budgets this channel is tied to</legend>
              {budgets.length === 0 ? <p className="mv-muted">No budgets yet.</p> : budgets.map((budget) => (
                <label key={budget.id} className="mv-check-row">
                  <input type="checkbox" checked={budgetIds.includes(budget.id)} onChange={() => toggleBudget(budget.id)} />
                  <span>{budget.name}</span>
                </label>
              ))}
              {budgetError && <p id={`${titleId}-budget-error`} className="mv-field-error" role="alert">{budgetError}</p>}
            </fieldset>
          )}

          {provider === 'email' ? (
            <div className="mv-field">
              <label htmlFor={`${titleId}-emails`}>Recipients</label>
              <div className={`mv-chip-input${emailError ? ' has-error' : ''}`}>
                {emails.map((email) => (
                  <span key={email} className="mv-recipient">
                    {email}
                    <button type="button" aria-label={`Remove ${email}`} onClick={() => setEmails(emails.filter((e) => e !== email))}><CloseIcon size={11} /></button>
                  </span>
                ))}
                <input
                  id={`${titleId}-emails`}
                  data-tour="channel-recipients"
                  value={draft}
                  onChange={(event) => { setDraft(event.target.value); setEmailError(null); }}
                  onKeyDown={onDraftKeyDown}
                  placeholder={emails.length ? 'Add another' : 'name@company.com'}
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={`${titleId}-emails-help`}
                  autoComplete="off"
                />
              </div>
              {emailError ? <p id={`${titleId}-emails-help`} className="mv-field-error" role="alert">{emailError}</p> : <p id={`${titleId}-emails-help`} className="mv-field-help">{defaultEmail && emails.includes(defaultEmail.trim()) ? 'Your own address is already here. ' : ''}Press Enter after each address. You can paste several at once.</p>}
            </div>
          ) : (
            <div className="mv-field">
              <label htmlFor={`${titleId}-webhook`}>Webhook URL</label>
              <input
                id={`${titleId}-webhook`}
                value={webhook}
                onChange={(event) => { setWebhook(event.target.value); setWebhookError(null); }}
                placeholder="https://your-tenant.webhook.office.com/webhookb2/…"
                aria-invalid={webhookError ? true : undefined}
                aria-describedby={`${titleId}-webhook-help`}
                autoComplete="off"
                inputMode="url"
              />
              {webhookError ? <p id={`${titleId}-webhook-help`} className="mv-field-error" role="alert">{webhookError}</p> : <p id={`${titleId}-webhook-help`} className="mv-field-help">From the Teams channel: Manage channel, Connectors, Incoming Webhook (or a Workflows webhook).</p>}
            </div>
          )}

          <div className="mv-dialog-actions">
            <button type="button" className="mv-secondary-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="mv-primary-button" data-tour="channel-submit">Add channel</button>
          </div>
        </form>
      </section>
    </div>
  );
}
