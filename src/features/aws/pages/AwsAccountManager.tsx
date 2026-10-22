import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth';
import { derivePermissions } from '../../../shared/lib/permissions';
import { useConfirm } from '../../../shared/ui/ConfirmProvider';
import { ConnectCloudAccountWizard } from '../../cloud';
import { useOpenOnArrival } from '../../../shared/lib/useOpenOnArrival';
import { SampleDataBadge, addAccountFromWizard } from '../../workspace';
import { CreditCardIcon, PencilIcon, EyeIcon, TrashIcon, CheckIcon, CloseIcon, LockIcon, ChevronLeftIcon, PlusIcon } from '../../../shared/ui/icons';
import { useAwsAccounts } from '../model/AwsAccountContext';
import type { AwsAccount } from '../model/awsTypes';

function maskAccessKey(accessKey: string): string {
  return accessKey.length <= 8 ? accessKey : `${accessKey.slice(0, 4)}••••••••••••${accessKey.slice(-4)}`;
}

/**
 * AccountManager, ported from the reference CCM app's aws/pages/AccountManager.jsx:
 * connect/rename/delete AWS accounts, same read-only and account-limit
 * gating logic as the Azure manager (`derivePermissions().aws`,
 * `accountLimits.aws`). AWS uses real nested routes rather than Azure's
 * view-state switcher (see AwsRoot.tsx), so navigation here goes through
 * `useNavigate`/`Link` to `/aws/account/:id` and `/aws` instead of callback
 * props. No real backend exists for this prototype, so accounts live in
 * `AwsAccountContext`'s local state, seeded from mock data — the connect
 * flow still runs through the real `ConnectCloudAccountWizard` (same
 * AKIA/ASIA-prefixed access-key regex and 40-char secret-key validation as
 * the reference), just with a mocked save.
 */
export function AwsAccountManager() {
  const navigate = useNavigate();
  const { user, cloudAccess, invoiceOnly, accountLimits } = useAuth();
  const permissions = derivePermissions(user, cloudAccess, invoiceOnly);
  const confirm = useConfirm();
  const { accounts, removeAccount, renameAccount } = useAwsAccounts();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [detailsAccount, setDetailsAccount] = useState<AwsAccount | null>(null);

  const isReadOnly = permissions.aws.readOnly && !permissions.isPrivileged;
  const maxAccounts = accountLimits.aws ?? 3;
  const atLimit = maxAccounts > 0 && accounts.length >= maxAccounts;

  // Ctrl+K "Connect AWS account" lands here with the connect form already open.
  useOpenOnArrival('connect', () => { if (!isReadOnly && !atLimit) setWizardOpen(true); });

  const startRename = (account: AwsAccount) => {
    setRenamingId(account.id);
    setRenameValue(account.name);
  };

  const commitRename = () => {
    if (!renamingId) return;
    renameAccount(renamingId, renameValue.trim() || accounts.find((a) => a.id === renamingId)?.name || '');
    setRenamingId(null);
  };

  const deleteAccount = async (account: AwsAccount) => {
    const ok = await confirm({
      title: 'Delete account?',
      description: `This will remove the AWS account "${account.name}" and all its cost data. This cannot be undone.`,
      variant: 'delete',
      okText: 'Delete',
    });
    if (ok) removeAccount(account.id);
  };

  return (
    <div>
      <div className="mv-page-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link className="mv-icon-button" aria-label="Back to dashboard" to="/aws">
            <ChevronLeftIcon size={20} />
          </Link>
          <span className="mv-avatar" style={{ background: '#f97316', borderRadius: '0.625rem' }}><CreditCardIcon size={18} /></span>
          <div>
            <h1 className="mv-title" style={{ fontSize: '1.375rem' }}>AWS Account Manager</h1>
            <p className="mv-subtitle">Connect your AWS accounts for cost monitoring.</p>
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
                  onClick={() => renamingId !== account.id && navigate(`/aws/account/${account.id}`)}
                >
                  <span className="mv-avatar" style={{ background: 'var(--mv-selected)', color: '#f97316' }}><CreditCardIcon size={16} /></span>
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
                      <strong>{account.name}{account.sample && <SampleDataBadge className="mv-account-sample" />}</strong>
                    )}
                    <span className="mv-muted">{account.region} · {maskAccessKey(account.accessKey)}</span>
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
            <p>Contact your administrator to add or remove AWS connections.</p>
          </div>
        ) : atLimit ? (
          <div className="mv-inline-error" role="alert">Account limit reached — your plan allows up to {maxAccounts} AWS account{maxAccounts === 1 ? '' : 's'}. Remove one or upgrade your plan to add another.</div>
        ) : (
          <>
            <div className="mv-notice">AWS Cost Explorer data syncs on demand — once saved, EC2, S3, RDS and Lambda costs are fetched live from Cost Explorer. Ensure Cost Explorer is enabled in your AWS account.</div>
            <button className="mv-primary-button" style={{ marginTop: '1rem' }} onClick={() => setWizardOpen(true)}>
              <PlusIcon size={16} style={{ marginRight: '0.375rem' }} />Connect Account
            </button>
          </>
        )}
      </section>

      {wizardOpen && (
        <ConnectCloudAccountWizard
          provider="aws"
          open
          onClose={() => setWizardOpen(false)}
          onSave={async (payload) => {
            await new Promise((resolve) => setTimeout(resolve, 500));
            addAccountFromWizard('aws', payload);
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
              <div><span className="mv-muted">Access Key ID</span><code className="mv-code">{detailsAccount.accessKey}</code></div>
              <div><span className="mv-muted">Region</span><code className="mv-code">{detailsAccount.region}</code></div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
