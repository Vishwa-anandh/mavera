import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth';
import { useConfirm } from '../../../shared/ui/ConfirmProvider';
import { CloudIcon, ChevronDownIcon, ChevronRightIcon, TrashIcon, PencilIcon, CheckIcon, CloseIcon, PlusIcon, LockIcon } from '../../../shared/ui/icons';
import { useBtpAccounts } from '../model/BtpAccountContext';
import { MOCK_BTP_SM_CONFIGS, MOCK_BTP_SUBACCOUNTS } from '../../../demo/btp/mockBtpData';
import { btpRegionLabel } from '../model/btpDerivations';
import type { BtpAccount } from '../model/btpTypes';

interface FormState {
  name: string;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  targetUrl: string;
  cisClientId: string;
  cisClientSecret: string;
  cisTokenUrl: string;
  cisAccountsUrl: string;
}

const emptyForm: FormState = { name: '', clientId: '', clientSecret: '', tokenUrl: '', targetUrl: '', cisClientId: '', cisClientSecret: '', cisTokenUrl: '', cisAccountsUrl: '' };

function subdomainOf(url: string): string | null {
  try {
    return new URL(url).hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}

function validate(form: FormState): string | null {
  if (!form.name.trim()) return 'Account name is required.';
  if (!form.clientId.trim() || !form.clientSecret.trim()) return 'Client ID and Client Secret are required.';
  if (!form.tokenUrl.trim().startsWith('https://')) return 'Token URL must start with https://.';
  if (!form.targetUrl.trim().startsWith('https://')) return 'Reporting API Base URL must start with https://.';

  const cisAny = form.cisClientId || form.cisClientSecret || form.cisTokenUrl || form.cisAccountsUrl;
  if (cisAny) {
    if (!form.cisClientId.trim() || !form.cisClientSecret.trim()) return 'CIS Client ID and Client Secret are required if configuring CIS_Central.';
    if (!form.cisTokenUrl.trim().startsWith('https://')) return 'CIS Token URL must start with https://.';
    if (!form.cisAccountsUrl.trim().startsWith('https://')) return 'Accounts Service URL must start with https://.';
    const costSub = subdomainOf(form.tokenUrl);
    const cisSub = subdomainOf(form.cisTokenUrl);
    if (costSub && cisSub && costSub.toLowerCase() !== cisSub.toLowerCase()) {
      return `Subdomain mismatch — COST_API uses "${costSub}" but CIS uses "${cisSub}". Both must share the same authentication tenant.`;
    }
  }
  return null;
}

function appendOAuthPath(url: string): string {
  return url && !url.endsWith('/oauth/token') ? `${url.replace(/\/$/, '')}/oauth/token` : url;
}

/**
 * AccountManager, ported from the reference CCM app's
 * btp/pages/BtpAccountManager.jsx: BTP's auth model is genuinely different
 * from Azure/AWS/GCP — up to 3 independent credential sets (COST_API
 * required, CIS_Central optional account-wide, Service Manager optional
 * per-subaccount). This form collects the first two; Service Manager is
 * configured per-subaccount from the expanded subaccounts list below (a
 * lightweight inline stand-in for the reference's `BtpServiceManagerModal`).
 *
 * There's no centralized `derivePermissions()` in the reference codebase
 * (confirmed via research) — every page inlines its own read-only check,
 * so this mirrors that rather than inventing a shared abstraction just for
 * BTP.
 */
export function BtpAccountManager() {
  const { user, accountLimits } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { accounts, addAccount, removeAccount, renameAccount } = useBtpAccounts();
  const isReadOnly = user?.role !== 'admin' && user?.role !== 'owner' && Boolean(user?.canViewBtp === false);
  const maxAccounts = accountLimits.btp ?? 3;
  const atLimit = maxAccounts > 0 && accounts.length >= maxAccounts;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [cisOpen, setCisOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const update = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });
  const blurAppendOAuth = (key: 'tokenUrl' | 'cisTokenUrl') => () => setForm((f) => ({ ...f, [key]: appendOAuthPath(f[key]) }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validate(form);
    if (found) { setError(found); return; }
    setError(null);
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    addAccount({
      id: `btp-acc-${accounts.length + 1}`,
      name: form.name,
      targetUrl: form.targetUrl,
      region: subdomainOf(form.targetUrl) ?? undefined,
      hasCis: Boolean(form.cisClientId),
    });
    setForm(emptyForm);
    setSaving(false);
  };

  const startRename = (account: BtpAccount) => { setRenamingId(account.id); setRenameValue(account.name); };
  const commitRename = () => { if (renamingId) renameAccount(renamingId, renameValue.trim() || accounts.find((a) => a.id === renamingId)?.name || ''); setRenamingId(null); };

  const deleteAccount = async (account: BtpAccount) => {
    const ok = await confirm({ title: 'Delete account?', description: `This will remove the BTP account "${account.name}" and all its cost data. This cannot be undone.`, variant: 'delete', okText: 'Delete' });
    if (ok) removeAccount(account.id);
  };

  return (
    <div>
      <div className="mv-page-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="mv-avatar" style={{ background: '#0070f2', borderRadius: '0.625rem' }}><CloudIcon size={18} /></span>
          <div>
            <h1 className="mv-title" style={{ fontSize: '1.375rem' }}>BTP Account Manager</h1>
            <p className="mv-subtitle">Connect your SAP BTP global accounts for cost monitoring.</p>
          </div>
        </div>
        <span className={`mv-status ${atLimit ? 'mv-status--danger' : 'mv-status--neutral'}`}>{accounts.length}/{maxAccounts > 0 ? maxAccounts : '∞'} accounts</span>
      </div>

      {accounts.length > 0 && (
        <section className="mv-panel" style={{ marginBottom: '1rem' }}>
          <div className="mv-panel-header"><h2 className="mv-panel-title">Connected Accounts</h2></div>
          <ul className="mv-account-list">
            {accounts.map((account) => {
              const subaccounts = account.hasCis ? MOCK_BTP_SUBACCOUNTS : [];
              const expanded = expandedId === account.id;
              return (
                <li key={account.id} className="mv-account-row" style={{ flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                    {!account.hasCis && <span aria-hidden style={{ width: '2.25rem', flex: 'none' }} />}
                    {account.hasCis && (
                      <button className="mv-icon-button" aria-label={expanded ? 'Collapse subaccounts' : 'Expand subaccounts'} onClick={() => setExpandedId(expanded ? null : account.id)}>
                        {expanded ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
                      </button>
                    )}
                    <button type="button" className="mv-account-row-body" style={{ flex: 1 }} onClick={() => renamingId !== account.id && navigate(`/btp/account/${account.id}`)}>
                      <span className="mv-avatar" style={{ background: 'var(--mv-selected)', color: '#0070f2' }}><CloudIcon size={16} /></span>
                      <span className="mv-account-row-meta">
                        {renamingId === account.id ? (
                          <input autoFocus className="mv-account-rename-input" value={renameValue} onClick={(e) => e.stopPropagation()} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingId(null); }} />
                        ) : (
                          <strong>{account.name}{account.hasCis && <span className="mv-status mv-status--info" style={{ marginLeft: '0.5rem' }}>CIS</span>}</strong>
                        )}
                        <span className="mv-muted">{account.targetUrl}</span>
                      </span>
                    </button>
                    <span className="mv-account-row-actions">
                      {renamingId === account.id ? (
                        <>
                          <button className="mv-icon-button" aria-label="Save name" onClick={commitRename}><CheckIcon size={16} /></button>
                          <button className="mv-icon-button" aria-label="Cancel rename" onClick={() => setRenamingId(null)}><CloseIcon size={16} /></button>
                        </>
                      ) : (
                        <>
                          {!isReadOnly && <button className="mv-icon-button" aria-label={`Rename ${account.name}`} onClick={() => startRename(account)}><PencilIcon size={16} /></button>}
                          {!isReadOnly && <button className="mv-icon-button" aria-label={`Delete ${account.name}`} onClick={() => void deleteAccount(account)}><TrashIcon size={16} /></button>}
                        </>
                      )}
                    </span>
                  </div>
                  {expanded && subaccounts.length > 0 && (
                    <div style={{ width: '100%', marginTop: '0.625rem', paddingLeft: '2.5rem', display: 'grid', gap: '0.5rem' }}>
                      {subaccounts.map((sub) => {
                        const smConfig = MOCK_BTP_SM_CONFIGS[sub.guid];
                        return (
                          <button
                            key={sub.guid}
                            type="button"
                            className="mv-account-row-body"
                            style={{ justifyContent: 'space-between', border: '1px solid var(--mv-divider)', borderRadius: '0.5rem', padding: '0.625rem' }}
                            onClick={() => navigate(`/btp/account/${account.id}/subaccount/${sub.guid}/service-instances`)}
                          >
                            <span className="mv-account-row-meta">
                              <strong>{sub.displayName}</strong>
                              <span className="mv-muted">{btpRegionLabel(sub.region)}</span>
                            </span>
                            {smConfig ? (
                              <span className="mv-status mv-status--success">SM Configured</span>
                            ) : (
                              <span className="mv-muted">Service Manager not configured</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {isReadOnly ? (
        <section className="mv-panel">
          <div className="mv-empty" style={{ margin: 0 }}>
            <div className="mv-empty-icon" aria-hidden><LockIcon size={32} /></div>
            <h2>Read-only mode</h2>
            <p>Contact your administrator to add or remove BTP connections.</p>
          </div>
        </section>
      ) : atLimit ? (
        <div className="mv-inline-error" role="alert">Account limit reached — your plan allows up to {maxAccounts} BTP account{maxAccounts === 1 ? '' : 's'}.</div>
      ) : (
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">Connect New Account</h2></div>
          {error && <div className="mv-inline-error" role="alert" style={{ marginBottom: '1rem' }}>{error}</div>}
          <form onSubmit={submit}>
            <div className="mv-notice" style={{ marginBottom: '1rem' }}>
              <strong>Service Instance 1 — COST_API</strong> (required, Usage Data Management Service, plan <code className="mv-code">reporting-ga-admin</code>). Path: BTP Cockpit → subaccount → Cloud Foundry → Spaces → Instances → COST_API → Service Keys → View.
            </div>
            <div className="mv-sa-field-grid">
              <label className="mv-field">Account Name<input value={form.name} onChange={update('name')} placeholder="Mavera SAP Landscape" /></label>
              <label className="mv-field">Client ID<input value={form.clientId} onChange={update('clientId')} /></label>
              <label className="mv-field">Client Secret<input type="password" value={form.clientSecret} onChange={update('clientSecret')} /></label>
              <label className="mv-field">Token URL<input value={form.tokenUrl} onChange={update('tokenUrl')} onBlur={blurAppendOAuth('tokenUrl')} placeholder="https://...authentication.eu10.hana.ondemand.com" /></label>
              <label className="mv-field" style={{ gridColumn: '1 / -1' }}>Reporting API Base URL<input value={form.targetUrl} onChange={update('targetUrl')} placeholder="https://reporting.cf.eu10.hana.ondemand.com" /></label>
            </div>

            <button type="button" className="mv-quiet-button" style={{ display: 'flex', marginBottom: '1rem' }} onClick={() => setCisOpen((v) => !v)}>
              <ChevronDownIcon size={14} style={{ marginRight: '0.375rem', transform: cisOpen ? 'rotate(180deg)' : undefined }} />
              Service Instance 2 — CIS_Central (optional — account hierarchy &amp; subaccounts)
            </button>
            {cisOpen && (
              <div style={{ marginBottom: '1rem' }}>
                <div className="mv-notice" style={{ marginBottom: '1rem' }}>
                  Cloud Management Service, plan <code className="mv-code">central-viewer</code>. Adding this unlocks the directory/subaccount Hierarchy tab on the cost page. Expected subdomain: same as COST_API's Token URL.
                </div>
                <div className="mv-sa-field-grid">
                  <label className="mv-field">CIS Client ID<input value={form.cisClientId} onChange={update('cisClientId')} /></label>
                  <label className="mv-field">CIS Client Secret<input type="password" value={form.cisClientSecret} onChange={update('cisClientSecret')} /></label>
                  <label className="mv-field">CIS Token URL<input value={form.cisTokenUrl} onChange={update('cisTokenUrl')} onBlur={blurAppendOAuth('cisTokenUrl')} /></label>
                  <label className="mv-field">Accounts Service URL<input value={form.cisAccountsUrl} onChange={update('cisAccountsUrl')} /></label>
                </div>
              </div>
            )}

            <button className="mv-primary-button" type="submit" disabled={saving}><PlusIcon size={16} style={{ marginRight: '0.375rem' }} />{saving ? 'Connecting…' : 'Connect Account'}</button>
          </form>
        </section>
      )}
    </div>
  );
}
