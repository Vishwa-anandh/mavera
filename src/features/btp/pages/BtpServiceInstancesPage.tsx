import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeftIcon, RefreshIcon } from '../../../shared/ui/icons';
import { useBtpAccounts } from '../model/BtpAccountContext';
import { MOCK_BTP_SERVICE_INSTANCES, MOCK_BTP_SM_CONFIGS, MOCK_BTP_SUBACCOUNTS } from '../../../demo/btp/mockBtpData';

/**
 * Standalone service-instances page, ported from the reference CCM app's
 * btp/pages/BtpServiceInstancesPage.jsx — reached from a subaccount row in
 * the Account Manager (BtpAccountManager.tsx) or the Hierarchy tab's own
 * embedded panel (BtpCostPage's Hierarchy tab renders the same table
 * inline rather than linking here, matching the reference's "full page"
 * vs "embedded panel" duality).
 */
export function BtpServiceInstancesPage() {
  const { accountId, subaccountId } = useParams<{ accountId: string; subaccountId: string }>();
  const navigate = useNavigate();
  const { getAccount } = useBtpAccounts();
  const account = getAccount(accountId ?? '');
  const subaccount = MOCK_BTP_SUBACCOUNTS.find((s) => s.guid === subaccountId);
  const config = subaccountId ? MOCK_BTP_SM_CONFIGS[subaccountId] : undefined;
  const instances = subaccountId ? (MOCK_BTP_SERVICE_INSTANCES[subaccountId] ?? []) : [];

  return (
    <div>
      <div className="mv-page-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="mv-icon-button" aria-label="Back" onClick={() => navigate(-1)}><ChevronLeftIcon size={20} /></button>
          <div>
            <h1 className="mv-title" style={{ fontSize: '1.25rem' }}>Service Instances</h1>
            <p className="mv-subtitle">{subaccount?.displayName ?? subaccountId} · {account?.name}</p>
          </div>
        </div>
        <button className="mv-secondary-button"><RefreshIcon size={16} style={{ marginRight: '0.375rem' }} />Refresh</button>
      </div>

      <p className="mv-muted" style={{ marginBottom: '1rem' }}>
        {config?.lastSyncedAt ? `Last synced ${new Date(config.lastSyncedAt).toLocaleString()}` : 'Not yet synced — click Refresh to discover instances.'}
      </p>

      {!config ? (
        <div className="mv-empty">
          <h2>Service Manager not configured</h2>
          <p>Configure Service Manager credentials for this subaccount to discover its Cloud Foundry/Kyma service instances.</p>
        </div>
      ) : instances.length === 0 ? (
        <div className="mv-empty"><h2>No instances found</h2><p>This subaccount has no service instances yet.</p></div>
      ) : (
        <section className="mv-panel">
          <div className="mv-table-wrap">
            <table className="mv-table">
              <thead>
                <tr><th>Instance Name</th><th>Service Offering</th><th>Service Plan</th><th>Platform</th><th>Status</th><th>Created</th><th>Last Synced</th></tr>
              </thead>
              <tbody>
                {instances.map((inst) => (
                  <tr key={inst.id}>
                    <td>{inst.name}</td>
                    <td>{inst.serviceOfferingName}</td>
                    <td className="mv-code">{inst.servicePlanName}</td>
                    <td><span className="mv-status mv-status--neutral">{inst.platformType}</span></td>
                    <td><span className={`mv-status mv-status--${inst.status.includes('succeeded') ? 'success' : inst.status.includes('failed') ? 'danger' : 'warning'}`}>{inst.status}</span></td>
                    <td>{new Date(inst.createdAtSm).toLocaleDateString()}</td>
                    <td>{new Date(inst.lastSyncedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
