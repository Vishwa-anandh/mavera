import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth';
import { useConfirm } from '../../../shared/ui/ConfirmProvider';
import { CloudIcon, ChevronRightIcon, TrashIcon, PlusIcon, LockIcon } from '../../../shared/ui/icons';
import { useGcpAccounts } from '../model/GcpAccountContext';
import { SampleDataBadge, openConnectDialog, useConnectOnArrival } from '../../workspace';

/**
 * AccountManager, ported from the reference CCM app's
 * gcp/pages/GcpAccountManager.jsx: GCP connects via a service-account JSON
 * key (Billing Account Viewer role), a different credential shape from
 * Azure's tenant/client/secret or AWS's access-key pair; the shared connect
 * dialog collects it. GCP uses real nested routes, same as AWS (see
 * GcpAccountContext.tsx).
 */
export function GcpAccountManager() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { accounts, removeAccount } = useGcpAccounts();
  const isReadOnly = user?.role !== 'admin' && user?.role !== 'owner' && Boolean(user?.canViewGcp === false);

  // A "connect" request (Ctrl+K, a deep link) opens the shared connect dialog over this page.
  useConnectOnArrival('gcp');

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
                    <strong>{account.name}{account.sample && <SampleDataBadge className="mv-account-sample" />}</strong>
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
            In GCP Console → IAM &amp; Admin → Service Accounts, create a service account and grant it the <strong>Billing Account Viewer</strong> role. Download the JSON key and paste it when you connect. Credentials are encrypted before storage.
          </div>
          <button className="mv-primary-button" style={{ marginTop: '1rem' }} onClick={() => openConnectDialog('gcp')}>
            <PlusIcon size={16} style={{ marginRight: '0.375rem' }} />Connect Project
          </button>
        </section>
      )}
    </div>
  );
}
