import { useId, useState } from 'react';
import { sapAdminRepository } from '../../../data-access';
import { fireToast } from '../../../shared/lib/toastEvents';
import { MailIcon, PlusIcon, TrashIcon } from '../../../shared/ui/icons';
import { validateRecipient } from '../model/sapAlerts';

const repo = sapAdminRepository.alerts;

/** Who gets alert emails (the Recipients tab). A short list held for this session: adding and removing is real, sending mail is not connected. */
export function AlertRecipientsPanel() {
  const titleId = useId();
  const errorId = useId();
  const [recipients, setRecipients] = useState<string[]>(() => repo.listRecipients());
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const problem = validateRecipient(email, recipients);
    setError(problem);
    if (problem) return;
    setRecipients(repo.addRecipient(email));
    fireToast({ type: 'success', message: `${email.trim()} will receive alert emails.` });
    setEmail('');
  };

  const remove = (address: string) => {
    setRecipients(repo.removeRecipient(address));
    fireToast({ type: 'info', message: `${address} removed from alert recipients.` });
  };

  return (
    <section className="mv-panel mv-alert-recipients" aria-labelledby={titleId}>
      <div className="mv-panel-header">
        <h2 className="mv-panel-title" id={titleId}><MailIcon size={18} style={{ verticalAlign: -3, marginRight: '0.5rem' }} />Alert recipients</h2>
        <span className="mv-muted">{recipients.length} {recipients.length === 1 ? 'recipient' : 'recipients'}</span>
      </div>
      <p className="mv-muted">These addresses receive SAP and HANA alert emails.</p>
      <form className="mv-recipient-form" noValidate onSubmit={(e) => { e.preventDefault(); add(); }}>
        <label className="mv-field mv-field--flex">Email address
          <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }} placeholder="name@company.com" aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} autoComplete="off" />
          {error && <span className="mv-field-error" id={errorId} role="alert">{error}</span>}
        </label>
        <button type="submit" className="mv-primary-button"><PlusIcon size={14} style={{ marginRight: '0.375rem' }} />Add</button>
      </form>
      {recipients.length === 0 ? (
        <p className="mv-empty-inline">No recipients. Alerts will not be emailed to anyone.</p>
      ) : (
        <ul className="mv-recipient-list" aria-label="Alert recipients">
          {recipients.map((address) => (
            <li key={address}>
              <span>{address}</span>
              <button type="button" className="mv-icon-button" aria-label={`Remove recipient ${address}`} onClick={() => remove(address)}><TrashIcon size={14} /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="mv-notice">Sample data: the list is kept for this session only and no email is sent from this demo.</div>
    </section>
  );
}
