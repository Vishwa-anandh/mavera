import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth';
import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import { PasswordField } from '../../../shared/ui/PasswordField';
import { useMaveraTheme } from '../../../shared/theme/ThemeProvider';

const ROLE_LABEL = { owner: 'Owner', admin: 'Administrator', member: 'Member' } as const;
const MODULE_LABELS = [
  { key: 'sapMonitoring', label: 'SAP Monitoring' },
  { key: 'cloudCost', label: 'Cloud Cost Monitoring' },
  { key: 'idocMonitoring', label: 'IDoc Monitoring' },
] as const;

function errorText(error: unknown): string {
  const data = (error as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
  return data?.error ?? data?.message ?? 'Couldn’t change your password. Check your current password and try again.';
}

/**
 * §11.6 — the signed-in user's profile and preferences, ported from the reference app's profile
 * modal: identity, organisation context, appearance and password change. Identity is read-only
 * (no profile-update endpoint exists); the password form uses the supported
 * `/auth/change-password` contract. Theme changes apply immediately.
 */
export function AccountPage() {
  const { user, modules, planType, changePassword } = useAuth();
  const { mode, setMode } = useMaveraTheme();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const name = user?.name || user?.email?.split('@')[0] || 'Account';
  const initial = name.slice(0, 1).toUpperCase();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaved(false);
    if (!current || !next || !confirm) return setError('Fill in all three password fields.');
    if (next.length < 8) return setError('Use at least 8 characters for the new password.');
    if (next === current) return setError('Choose a new password that’s different from your current one.');
    if (next !== confirm) return setError('The new passwords don’t match.');
    setError(null);
    setSaving(true);
    try {
      await changePassword(current, next);
      setCurrent(''); setNext(''); setConfirm('');
      setSaved(true);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mv-reading-width">
      <AppBreadcrumb items={[{ label: 'Account' }]} />
      <div className="mv-page-heading">
        <div>
          <h1 className="mv-title">Account</h1>
          <p className="mv-subtitle">Your profile, organisation and preferences.</p>
        </div>
      </div>

      <section className="mv-panel mv-account-section" aria-labelledby="identity-title">
        <h2 className="mv-panel-title" id="identity-title">Profile</h2>
        <div className="mv-account-identity">
          <span className="mv-avatar mv-avatar--lg" aria-hidden="true">{initial}</span>
          <dl className="mv-detail-list">
            <div><dt>Name</dt><dd>{name}</dd></div>
            <div><dt>Email</dt><dd>{user?.email ?? '—'}</dd></div>
            <div><dt>Role</dt><dd>{user ? ROLE_LABEL[user.role] : '—'}</dd></div>
          </dl>
        </div>
        <p className="mv-muted">Your name and email come from your organisation’s user directory. Ask an administrator to change them.</p>
      </section>

      <section className="mv-panel mv-account-section" aria-labelledby="org-title">
        <h2 className="mv-panel-title" id="org-title">Organisation</h2>
        <dl className="mv-detail-list">
          <div><dt>Organisation</dt><dd>{user?.orgName ?? 'Not provided'}</dd></div>
          <div><dt>Plan</dt><dd style={{ textTransform: 'capitalize' }}>{planType === 'basic' ? 'Free' : planType}</dd></div>
          <div><dt>Modules</dt><dd>{MODULE_LABELS.filter((m) => modules[m.key]).map((m) => m.label).join(', ') || 'None'}</dd></div>
        </dl>
        <p className="mv-selection-links">
          <Link to="/subscription">View subscription</Link>
          <Link to="/billing">Billing &amp; invoices</Link>
        </p>
      </section>

      <section className="mv-panel mv-account-section" aria-labelledby="prefs-title">
        <h2 className="mv-panel-title" id="prefs-title">Preferences</h2>
        <div className="mv-pref-row">
          <span id="appearance-label"><strong>Appearance</strong><span className="mv-muted">Applies straight away on this device.</span></span>
          <div className="mv-segmented" role="radiogroup" aria-labelledby="appearance-label">
            {(['light', 'dark'] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} className={`mv-segmented-btn${mode === m ? ' is-active' : ''}`} onClick={() => setMode(m)}>
                {m === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mv-panel mv-account-section" aria-labelledby="password-title">
        <h2 className="mv-panel-title" id="password-title">Change password</h2>
        <form className="mv-account-form" onSubmit={submit} noValidate>
          {error && <div className="mv-auth-alert" role="alert">{error}</div>}
          {saved && <div className="mv-notice" role="status">Password changed. Use the new password next time you sign in.</div>}
          <PasswordField label="Current password" name="currentPassword" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          <PasswordField label="New password" name="newPassword" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} aria-describedby="new-password-help" />
          <p className="mv-muted" id="new-password-help">At least 8 characters, different from your current password.</p>
          <PasswordField label="Confirm new password" name="confirmPassword" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <div className="mv-dialog-actions" style={{ justifyContent: 'flex-start' }}>
            <button type="submit" className="mv-primary-button" disabled={saving}>{saving ? 'Saving…' : 'Change password'}</button>
          </div>
        </form>
      </section>

      <section className="mv-panel mv-account-section" aria-labelledby="help-title">
        <h2 className="mv-panel-title" id="help-title">Help &amp; support</h2>
        <p className="mv-muted">Questions about your account or Mavera? <a href="https://www.maitsys.com/contact-us" target="_blank" rel="noopener noreferrer">Contact Maitsys support</a> (opens maitsys.com).</p>
      </section>
    </div>
  );
}
