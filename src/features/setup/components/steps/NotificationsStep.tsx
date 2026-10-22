import { useState, type KeyboardEvent } from 'react';
import { budgetsRepository } from '../../../../data-access';
import { fireToast } from '../../../../shared/lib/toastEvents';
import { CloseIcon } from '../../../../shared/ui/icons';
import { addEmailAlertChannel, addRecipients, isValidEmail } from '../../../budgets';
import { useContinueHandler, type RegisterContinue } from '../../model/useContinueHandler';
import { FormCard } from '../FormCard';

interface NotificationsStepProps {
  register: RegisterContinue;
  /** The signed-in person's address: the first recipient, so adding yourself needs no typing. */
  defaultEmail?: string;
  /** Called after the stores changed, so the derived progress is read again. */
  onChanged: () => void;
}

/** Step 3: who is told when a budget or an alert fires. Adds an e-mail channel for every budget (budgets feature). */
export function NotificationsStep({ register, defaultEmail, onChanged }: NotificationsStepProps) {
  const [emails, setEmails] = useState<string[]>(() => (defaultEmail && isValidEmail(defaultEmail) ? [defaultEmail.trim()] : []));
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const channels = budgetsRepository.listChannels().filter((channel) => channel.provider === 'email' && channel.email_addresses.length > 0);

  const commitDraft = (): string[] | null => {
    if (!draft.trim()) return emails;
    const result = addRecipients(emails, draft);
    setEmails(result.emails);
    setError(result.error);
    if (result.error) return null;
    setDraft('');
    return result.emails;
  };

  const save = (): boolean => {
    const list = commitDraft();
    if (list === null) return false;
    if (list.length === 0) {
      setError('Add at least one email address and press Enter.');
      return false;
    }
    addEmailAlertChannel(list);
    setEmails([]);
    setError(null);
    onChanged();
    fireToast({ type: 'success', message: `Alerts will be sent to ${list.length} ${list.length === 1 ? 'address' : 'addresses'}.` });
    return true;
  };

  // Continue saves what is in the box; with nothing to add (or already set up) it just moves on.
  useContinueHandler(register, () => (emails.length === 0 && !draft.trim() ? true : save()));

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === ';') {
      event.preventDefault();
      commitDraft();
    } else if (event.key === 'Backspace' && !draft && emails.length > 0) {
      setEmails(emails.slice(0, -1));
    }
  };

  return (
    <div className="mv-setup-stack">
      <FormCard title="Alert recipients" description="These addresses get an email when a budget threshold is crossed or an alert needs attention.">
        <div className="mv-field mv-setup-field">
          <label htmlFor="setup-recipients">Recipients</label>
          <div className={`mv-chip-input${error ? ' has-error' : ''}`}>
            {emails.map((email) => (
              <span key={email} className="mv-recipient">
                {email}
                <button type="button" aria-label={`Remove ${email}`} onClick={() => setEmails(emails.filter((item) => item !== email))}><CloseIcon size={11} /></button>
              </span>
            ))}
            <input
              id="setup-recipients"
              data-autofocus
              value={draft}
              onChange={(event) => { setDraft(event.target.value); setError(null); }}
              onKeyDown={onKeyDown}
              placeholder={emails.length ? 'Add another' : 'name@company.com'}
              aria-invalid={error ? true : undefined}
              aria-describedby="setup-recipients-note"
              autoComplete="off"
            />
          </div>
          <div className="mv-setup-field-foot" id="setup-recipients-note">
            {error ? <span className="mv-field-error" role="alert">{error}</span> : <span className="mv-field-help">Press Enter after each address. You can paste several at once.</span>}
          </div>
        </div>
        <div>
          <button type="button" className="mv-secondary-button" onClick={save}>Add recipients</button>
        </div>
      </FormCard>

      <FormCard title="Who is notified now" description={channels.length === 0 ? 'Nobody yet. Add the first address above.' : 'Email channels that receive budget alerts.'}>
        {channels.length > 0 && (
          <ul className="mv-setup-list" aria-label="Alert channels">
            {channels.map((channel) => (
              <li key={channel.id} className="mv-setup-list-row">
                <span className="mv-setup-list-text"><strong>Email</strong><span className="mv-muted">{channel.email_addresses.join(', ')}</span></span>
                <span className="mv-status mv-status--neutral">{channel.alert_scope === 'global' ? 'Every budget' : 'Chosen budgets'}</span>
              </li>
            ))}
          </ul>
        )}
      </FormCard>
    </div>
  );
}
