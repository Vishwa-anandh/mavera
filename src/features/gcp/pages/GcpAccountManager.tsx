import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth';
import { useConfirm } from '../../../shared/ui/ConfirmProvider';
import { CloudIcon, ChevronRightIcon, TrashIcon, PlusIcon, LockIcon } from '../../../shared/ui/icons';
import { useGcpAccounts } from '../model/GcpAccountContext';

interface FormState {
  name: string;
  projectId: string;
  serviceAccountJson: string;
}

const emptyForm: FormState = { name: '', projectId: '', serviceAccountJson: '' };

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.name.trim()) errors.name = 'Account name is required';
  if (!form.projectId.trim()) errors.projectId = 'Project ID is required';
  if (!form.serviceAccountJson.trim()) {
    errors.serviceAccountJson = 'Service Account JSON is required';
  } else {
    try {
      const parsed = JSON.parse(form.serviceAccountJson) as { client_email?: string; private_key?: string };
      if (!parsed.client_email || !parsed.private_key) {
        errors.serviceAccountJson = 'JSON must contain client_email and private_key';
      }
    } catch {
      errors.serviceAccountJson = 'Must be valid JSON';
    }
  }
  return errors;
}

/**
 * AccountManager, ported from the reference CCM app's
 * gcp/pages/GcpAccountManager.jsx: GCP connects via a service-account JSON
 * key (Billing Account Viewer role), a fundamentally different credential
 * shape from Azure's tenant/client/secret or AWS's access-key pair — so
 * this uses its own single-step form rather than the shared
 * `ConnectCloudAccountWizard` (built for Azure/AWS's step-based
 * details→validate→save flow). GCP uses real nested routes, same as AWS
 * (see GcpAccountContext.tsx).
 */
export function GcpAccountManager() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { accounts, addAccount, removeAccount } = useGcpAccounts();
  const isReadOnly = user?.role !== 'admin' && user?.role !== 'owner' && Boolean(user?.canViewGcp === false);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'general', string>>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate(form);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    setSaving(true);
    setErrors({});
    await new Promise((resolve) => setTimeout(resolve, 500));
    addAccount({ id: `gcp-acc-${accounts.length + 1}`, name: form.name, projectId: form.projectId });
    setForm(emptyForm);
    setSaving(false);
    setSuccess('GCP account added successfully.');
    window.setTimeout(() => setSuccess(''), 4000);
  };

  const deleteAccount = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Remove account?',
      description: `"${name}" will be removed and its cost data deleted.`,
      variant: 'delete',
      okText: 'Remove',
    });
    if (ok) removeAccount(id);
  };

  return (
    <div>
      <div className="mv-page-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="mv-avatar" style={{ background: '#3b82f6', borderRadius: '0.625rem' }}><CloudIcon size={18} /></span>
          <div>
            <h1 className="mv-title" style={{ fontSize: '1.375rem' }}>GCP Account Manager</h1>
            <p className="mv-subtitle">Connect your Google Cloud projects for cost monitoring.</p>
          </div>
        </div>
      </div>

      {accounts.length > 0 && (
        <section className="mv-panel" style={{ marginBottom: '1rem' }}>
          <div className="mv-panel-header"><h2 className="mv-panel-title">Connected Projects</h2></div>
          <ul className="mv-account-list">
            {accounts.map((account) => (
              <li key={account.id} className="mv-account-row">
                <button type="button" className="mv-account-row-body" onClick={() => navigate(`/gcp/account/${account.id}`)}>
                  <span className="mv-avatar" style={{ background: 'var(--mv-selected)', color: '#3b82f6' }}><CloudIcon size={16} /></span>
                  <span className="mv-account-row-meta">
                    <strong>{account.name}</strong>
                    <span className="mv-muted">{account.projectId}</span>
                  </span>
                </button>
                <span className="mv-account-row-actions">
                  <button className="mv-icon-button" aria-label={`View ${account.name} costs`} onClick={() => navigate(`/gcp/account/${account.id}`)}><ChevronRightIcon size={16} /></button>
                  {!isReadOnly && (
                    <button className="mv-icon-button" aria-label={`Remove ${account.name}`} onClick={() => void deleteAccount(account.id, account.name)}><TrashIcon size={16} /></button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isReadOnly ? (
        <section className="mv-panel">
          <div className="mv-empty" style={{ margin: 0 }}>
            <div className="mv-empty-icon" aria-hidden><LockIcon size={32} /></div>
            <h2>Read-only mode</h2>
            <p>Contact your administrator to connect a GCP project.</p>
          </div>
        </section>
      ) : (
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">Connect New Project</h2></div>
          <div className="mv-notice">
            In GCP Console → IAM &amp; Admin → Service Accounts, create a service account and grant it the <strong>Billing Account Viewer</strong> role. Download the JSON key and paste it below. Credentials are encrypted before storage.
          </div>
          {errors.general && <div className="mv-inline-error" role="alert" style={{ marginTop: '0.75rem' }}>{errors.general}</div>}
          {success && <div className="mv-notice" style={{ marginTop: '0.75rem' }}>{success}</div>}
          <form onSubmit={submit} style={{ marginTop: '1rem' }}>
            <div className="mv-sa-field-grid">
              <label className="mv-field">
                Display Name
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My GCP Project" />
                {errors.name && <span className="mv-field-error">{errors.name}</span>}
              </label>
              <label className="mv-field">
                Project ID
                <input value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} placeholder="my-project-123456" />
                {errors.projectId && <span className="mv-field-error">{errors.projectId}</span>}
                <span className="mv-field-help">The GCP project ID (not the project number).</span>
              </label>
            </div>
            <label className="mv-field">
              Service Account JSON Key
              <textarea
                rows={7}
                value={form.serviceAccountJson}
                onChange={(e) => setForm({ ...form, serviceAccountJson: e.target.value })}
                placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  "client_email": "...",\n  "private_key": "..."\n}'}
              />
              {errors.serviceAccountJson && <span className="mv-field-error">{errors.serviceAccountJson}</span>}
              <span className="mv-field-help">Paste the full downloaded JSON key file content.</span>
            </label>
            <button className="mv-primary-button" type="submit" disabled={saving}>
              <PlusIcon size={16} style={{ marginRight: '0.375rem' }} />{saving ? 'Connecting…' : 'Connect Project'}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
