import { useState } from 'react';
import { useAuth } from '../../auth';
import { derivePermissions } from '../../../shared/lib/permissions';
import { useConfirm } from '../../../shared/ui/ConfirmProvider';
import { ConnectCloudAccountWizard } from '../../cloud';
import { CreditCardIcon, PencilIcon, EyeIcon, TrashIcon, CheckIcon, CloseIcon, LockIcon, ChevronLeftIcon, PlusIcon } from '../../../shared/ui/icons';
import { MOCK_AZURE_ACCOUNTS } from '../../../demo/azure/mockAzureData';
import type { AzureAccount } from '../model/azureTypes';

function maskId(id: string): string {
  return id.length <= 12 ? id : `${id.slice(0, 8)}…${id.slice(-4)}`;
}

interface AzureAccountManagerProps {
  onSelectAccount: (account: AzureAccount) => void;
  onBack?: () => void;
}

/**
 * AccountManager, ported from the reference CCM app's
 * azure/pages/AccountManager.jsx: connect/rename/delete Azure subscriptions,
 * with the same read-only and account-limit gating logic
 * (`derivePermissions().azure`). No real backend exists for this prototype,
 * so accounts live in local state seeded from mock data rather than
 * `GET /azure/accounts` — the connect flow still runs through the real
 * `ConnectCloudAccountWizard` (same field names/validation as the
 * reference), just with a mocked save.
 */
export function AzureAccountManager({ onSelectAccount, onBack }: AzureAccountManagerProps) {
  const { user, cloudAccess, invoiceOnly, accountLimits } = useAuth();
  const permissions = derivePermissions(user, cloudAccess, invoiceOnly);
  const confirm = useConfirm();

  const [accounts, setAccounts] = useState<AzureAccount[]>(MOCK_AZURE_ACCOUNTS);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [detailsAccount, setDetailsAccount] = useState<AzureAccount | null>(null);

  const isReadOnly = permissions.azure.readOnly && !permissions.isPrivileged;
  const maxAccounts = accountLimits.azure ?? 3;
  const atLimit = maxAccounts > 0 && accounts.length >= maxAccounts;

  const startRename = (account: AzureAccount) => {
    setRenamingId(account.id);
    setRenameValue(account.name);
  };

  const commitRename = () => {
    if (!renamingId) return;
    setAccounts((current) => current.map((a) => (a.id === renamingId ? { ...a, name: renameValue.trim() || a.name } : a)));
    setRenamingId(null);
  };

  const deleteAccount = async (account: AzureAccount) => {
    const ok = await confirm({
      title: 'Delete account?',
      description: `This will remove the Azure account "${account.name}" and all its cost data. This cannot be undone.`,
      variant: 'delete',
      okText: 'Delete',
    });
    if (ok) setAccounts((current) => current.filter((a) => a.id !== account.id));
  };

  return (
    <div>
      <div className="mv-page-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {onBack && (
            <button className="mv-icon-button" aria-label="Back" onClick={onBack}>
              <ChevronLeftIcon size={20} />
            </button>
          )}
          <span className="mv-avatar" style={{ background: 'var(--mv-primary)', borderRadius: '0.625rem' }}><CreditCardIcon size={18} /></span>
          <div>
            <h1 className="mv-title" style={{ fontSize: '1.375rem' }}>Azure Account Manager</h1>
            <p className="mv-subtitle">Connect your Azure subscriptions for cost monitoring.</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          {isReadOnly && (
            <span className="mv-status mv-status--neutral"><LockIcon size={12} style={{ marginRight: '0.25rem', verticalAlign: -1 }} />Read-only</span>
          )}
          <span className={`mv-status ${atLimit ? 'mv-status--danger' : 'mv-status--neutral'}`}>
            {accounts.length}/{maxAccounts > 0 ? maxAccounts : '∞'} accounts
          </span>
        </div>
      </div>

      {accounts.length > 0 && (
        <section className="mv-panel" style={{ marginBottom: '1rem' }}>
          <div className="mv-panel-header"><h2 className="mv-panel-title">Connected Accounts</h2></div>
          <ul className="mv-account-list">
            {accounts.map((account) => (
              <li key={account.id} className="mv-account-row">
                <button
                  type="button"
                  className="mv-account-row-body"
                  onClick={() => renamingId !== account.id && onSelectAccount(account)}
                >
                  <span className="mv-avatar" style={{ background: 'var(--mv-selected)', color: 'var(--mv-primary)' }}><CreditCardIcon size={16} /></span>
                  <span className="mv-account-row-meta">
                    {renamingId === account.id ? (
                      <input
                        autoFocus
                        className="mv-account-rename-input"
                        value={renameValue}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename();
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                      />
                    ) : (
                      <strong>{account.name}</strong>
                    )}
                    <span className="mv-muted">Sub: {maskId(account.subscriptionId)} · Tenant: {maskId(account.tenantId)}</span>
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
                      {!isReadOnly && (
                        <button className="mv-icon-button" aria-label={`Rename ${account.name}`} onClick={() => startRename(account)}><PencilIcon size={16} /></button>
                      )}
                      <button className="mv-icon-button" aria-label={`View ${account.name} details`} onClick={() => setDetailsAccount(account)}><EyeIcon size={16} /></button>
                      {!isReadOnly && (
                        <button className="mv-icon-button" aria-label={`Delete ${account.name}`} onClick={() => void deleteAccount(account)}><TrashIcon size={16} /></button>
                      )}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mv-panel">
        {isReadOnly ? (
          <div className="mv-empty" style={{ margin: 0 }}>
            <div className="mv-empty-icon" aria-hidden><LockIcon size={28} /></div>
            <h2>Read-only mode</h2>
            <p>Contact your administrator to add or remove Azure subscriptions.</p>
          </div>
        ) : atLimit ? (
          <div className="mv-inline-error" role="alert">Account limit reached — your plan allows up to {maxAccounts} Azure account{maxAccounts === 1 ? '' : 's'}. Remove one or upgrade your plan to add another.</div>
        ) : (
          <>
            <div className="mv-notice">Azure cost data syncs automatically — once connected, subscription costs, resource groups, and service breakdown pull within a few minutes. Refreshes every hour.</div>
            <button className="mv-primary-button" style={{ marginTop: '1rem' }} onClick={() => setWizardOpen(true)}>
              <PlusIcon size={16} style={{ marginRight: '0.375rem' }} />Connect Account
            </button>
          </>
        )}
      </section>

      {wizardOpen && (
        <ConnectCloudAccountWizard
          provider="azure"
          open
          onClose={() => setWizardOpen(false)}
          onSave={async (payload) => {
            await new Promise((resolve) => setTimeout(resolve, 500));
            setAccounts((current) => [
              ...current,
              {
                id: `az-acc-${current.length + 1}`,
                name: payload.name ?? 'New subscription',
                subscriptionId: payload.subscriptionId ?? '',
                tenantId: payload.tenantId ?? '',
                clientId: payload.clientId ?? '',
              },
            ]);
          }}
        />
      )}

      {detailsAccount && (
        <div className="mv-dialog-backdrop" onClick={() => setDetailsAccount(null)}>
          <section className="mv-dialog" role="dialog" aria-modal="true" aria-label={`${detailsAccount.name} details`} onClick={(e) => e.stopPropagation()}>
            <div className="mv-panel-header">
              <h2 className="mv-panel-title">{detailsAccount.name}</h2>
              <button className="mv-icon-button" aria-label="Close" onClick={() => setDetailsAccount(null)}><CloseIcon size={18} /></button>
            </div>
            <div className="mv-key-value">
              <div><span className="mv-muted">Subscription ID</span><code className="mv-code">{detailsAccount.subscriptionId}</code></div>
              <div><span className="mv-muted">Tenant ID</span><code className="mv-code">{detailsAccount.tenantId}</code></div>
              <div><span className="mv-muted">Client ID</span><code className="mv-code">{detailsAccount.clientId}</code></div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
