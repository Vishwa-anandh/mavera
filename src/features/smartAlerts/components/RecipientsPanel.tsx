import { useId, useState } from 'react';
import { smartAlertsRepository, type RecipientAlertType, type RecipientConfig } from '../../../data-access';
import { fireToast } from '../../../shared/lib/toastEvents';
import { validateEmailAddress } from '../../../shared/lib/emailAddress';
import { MailIcon, PlusIcon, TrashIcon } from '../../../shared/ui/icons';

const repo = smartAlertsRepository;

const GROUPS: Array<{ type: RecipientAlertType; title: string; help: string }> = [
  { type: 'cost_threshold', title: 'Cost and budget alerts', help: 'Spikes, unusual spend, forecasts and budget breaches.' },
  { type: 'resource_creation', title: 'Resource and service creation alerts', help: 'New and removed resources and services.' },
];

interface RecipientGroupProps {
  type: RecipientAlertType;
  title: string;
  help: string;
  config: RecipientConfig | undefined;
  onChange: (configs: RecipientConfig[]) => void;
}

function RecipientGroup({ type, title, help, config, onChange }: RecipientGroupProps) {
  const titleId = useId();
  const errorId = useId();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recipients = config?.recipients ?? [];

  const add = () => {
    const problem = validateEmailAddress(email, recipients);
    setError(problem);
    if (problem) return;
    onChange(repo.addRecipient(type, email));
    fireToast({ type: 'success', message: `${email.trim()} will receive ${title.toLowerCase()} emails.` });
    setEmail('');
  };

  const useDefault = () => {
    onChange(repo.resetRecipients(type));
    fireToast({ type: 'info', message: `${title} go back to all organisation members.` });
  };

  const remove = (address: string) => {
    onChange(repo.removeRecipient(type, address));
    fireToast({ type: 'info', message: `${address} removed from ${title.toLowerCase()}.` });
  };

  return (
    <section className="mv-panel" aria-labelledby={titleId}>
      <div className="mv-panel-header">
        <div>
          <h2 className="mv-panel-title" id={titleId}>{title}</h2>
          <p className="mv-muted" style={{ margin: '2px 0 0' }}>
            {help} {config ? `${recipients.length} custom ${recipients.length === 1 ? 'recipient' : 'recipients'}.` : 'Using the default: all organisation members.'}
          </p>
        </div>
        {config && <button type="button" className="mv-quiet-button" onClick={useDefault}>Use default</button>}
      </div>
      <form className="mv-recipient-form" noValidate onSubmit={(e) => { e.preventDefault(); add(); }}>
        <label className="mv-field mv-field--flex">Email address
          <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }} placeholder="name@company.com" aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} autoComplete="off" />
          {error && <span className="mv-field-error" id={errorId} role="alert">{error}</span>}
        </label>
        <button type="submit" className="mv-primary-button"><PlusIcon size={14} style={{ marginRight: '0.375rem' }} />Add</button>
      </form>
      {recipients.length > 0 && (
        <ul className="mv-recipient-list" aria-label={`${title} recipients`}>
          {recipients.map((address) => (
            <li key={address}>
              <span>{address}</span>
              <button type="button" className="mv-icon-button" aria-label={`Remove recipient ${address}`} onClick={() => remove(address)}><TrashIcon size={14} /></button>
            </li>
          ))}
        </ul>
      )}
      {config && recipients.length === 0 && <p className="mv-empty-inline">No custom recipients. These alerts will not be emailed to anyone.</p>}
    </section>
  );
}

/** The Recipients tab: who is emailed for each kind of alert. By default every organisation member; adding an address makes the list custom. */
export function RecipientsPanel() {
  const [configs, setConfigs] = useState<RecipientConfig[]>(() => repo.listRecipients());
  return (
    <div className="mv-alert-recipient-groups">
      <p className="mv-muted"><MailIcon size={14} style={{ marginRight: '0.375rem', verticalAlign: -2 }} />By default every organisation member receives alert emails. Add addresses to send a kind of alert to a chosen list instead.</p>
      {GROUPS.map((group) => (
        <RecipientGroup key={group.type} {...group} config={configs.find((c) => c.alert_type === group.type)} onChange={setConfigs} />
      ))}
      <div className="mv-notice">Sample data: the lists are kept for this session only and no email is sent from this demo.</div>
    </div>
  );
}
