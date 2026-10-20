import { useId, useState } from 'react';
import type { SapDestination, SapDestinationInput } from '../../../data-access';
import { PasswordField } from '../../../shared/ui/PasswordField';
import { Select } from '../../../shared/ui/Select';
import { SegmentedToggle } from '../../../shared/ui/SegmentedToggle';
import { CloseIcon, ServerIcon } from '../../../shared/ui/icons';
import { useModalOverlay } from '../../../shared/ui/useOverlay';
import {
  CONNECTION_STRATEGIES, TIMEZONES, draftFromDestination, emptyDraft, toInput, validateDestination, type DestinationDraft, type DestinationErrors,
} from '../model/destinations';

interface DestinationDialogProps {
  /** The destination being edited; omit to add a new one. */
  destination?: SapDestination;
  existing: SapDestination[];
  onClose: () => void;
  onSave: (input: SapDestinationInput) => void;
}

/** One form for both Add and Edit: edit opens it pre-filled. Errors show after the first attempt to save. */
export function DestinationDialog({ destination, existing, onClose, onSave }: DestinationDialogProps) {
  const editing = Boolean(destination);
  const titleId = useId();
  const panelRef = useModalOverlay<HTMLElement>(onClose);
  const [draft, setDraft] = useState<DestinationDraft>(() => (destination ? draftFromDestination(destination) : emptyDraft()));
  const [password, setPassword] = useState('');
  const [attempted, setAttempted] = useState(false);
  const errors: DestinationErrors = attempted ? validateDestination(draft, existing, destination?.id) : {};
  const set = <K extends keyof DestinationDraft>(key: K, value: DestinationDraft[K]) => setDraft((cur) => ({ ...cur, [key]: value }));
  const strategy = CONNECTION_STRATEGIES.find((s) => s.key === draft.connectionType);

  const submit = () => {
    setAttempted(true);
    if (Object.keys(validateDestination(draft, existing, destination?.id)).length > 0) return;
    onSave(toInput(draft));
  };

  return (
    <div className="mv-dialog-backdrop" onClick={onClose}>
      <section ref={panelRef} className="mv-dialog mv-dialog--wide" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <div className="mv-panel-header">
          <h2 className="mv-panel-title" id={titleId}><ServerIcon size={18} style={{ verticalAlign: -3, marginRight: '0.5rem' }} />{editing ? `Edit ${destination?.name}` : 'New Destination'}</h2>
          <button type="button" className="mv-icon-button" aria-label="Close" onClick={onClose}><CloseIcon size={18} /></button>
        </div>
        <form noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <p className="mv-muted">Set up your SAP environment connection. Choose a connection strategy and provide the required credentials.</p>

          <div className="mv-form-grid">
            <label className="mv-field">Environment Name
              <input value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Production S/4HANA" aria-invalid={Boolean(errors.name)} data-autofocus />
              {errors.name && <span className="mv-field-error" role="alert">{errors.name}</span>}
            </label>
            <label className="mv-field">SID
              <input value={draft.systems} onChange={(e) => set('systems', e.target.value)} placeholder="e.g. PRD, QAS" aria-invalid={Boolean(errors.systems)} />
              {errors.systems ? <span className="mv-field-error" role="alert">{errors.systems}</span> : <span className="mv-field-help">One or more system IDs, separated by commas.</span>}
            </label>
          </div>
          <Select label="SAP System Timezone" value={draft.timezone} onChange={(v) => set('timezone', v)} options={TIMEZONES.map((t) => ({ value: t, label: t }))} helpText="Daily monitoring snapshot fires at 23:55 in this timezone" />

          <h3 className="mv-detail-heading">Connection Strategy</h3>
          <SegmentedToggle label="Connection strategy" value={draft.connectionType} onChange={(v) => set('connectionType', v)} options={CONNECTION_STRATEGIES.map((s) => ({ value: s.key, label: s.label }))} />
          <p className="mv-field-help mv-strategy-help">{strategy?.help}</p>

          <h3 className="mv-detail-heading">Connection Details</h3>
          <label className="mv-field">Gateway URL
            <input value={draft.url} onChange={(e) => set('url', e.target.value)} placeholder="https://your-sap-host.com/sap/opu/odata/sap/..." aria-invalid={Boolean(errors.url)} inputMode="url" />
            {errors.url && <span className="mv-field-error" role="alert">{errors.url}</span>}
          </label>
          <div className="mv-form-grid">
            <label className="mv-field">Client<input value={draft.client} onChange={(e) => set('client', e.target.value)} placeholder="e.g. 100" /></label>
            <label className="mv-field">Language<input value={draft.language} onChange={(e) => set('language', e.target.value)} placeholder="e.g. EN" /></label>
          </div>

          <h3 className="mv-detail-heading">Authentication</h3>
          <div className="mv-form-grid">
            <label className="mv-field">Username<input value={draft.username} onChange={(e) => set('username', e.target.value)} placeholder="Your SAP user ID" autoComplete="off" /></label>
            <PasswordField label="Password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={editing ? 'Leave blank to keep the current password' : 'Enter your password'} autoComplete="new-password" />
          </div>
          <p className="mv-field-help">Use a service account or technical user. This sample does not keep the password.</p>

          <div className="mv-dialog-actions">
            <button type="button" className="mv-secondary-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="mv-primary-button">{editing ? 'Save Changes' : 'Add Destination'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
