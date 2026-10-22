import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fireToast } from '../../../shared/lib/toastEvents';
import { ChevronLeftIcon, RefreshIcon } from '../../../shared/ui/icons';
import { useBtpAccounts } from '../model/BtpAccountContext';
import { cloudSamplesRepository } from '../../../data-access';

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
  const subaccount = cloudSamplesRepository.btp.subaccounts().find((s) => s.guid === subaccountId);
  const config = subaccountId ? cloudSamplesRepository.btp.smConfig(subaccountId) : undefined;
  const [instances, setInstances] = useState(() => (subaccountId ? cloudSamplesRepository.btp.serviceInstances(subaccountId) : []));
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  /** Asks Service Manager for the subaccount's instances again, then says what came back. */
  const refresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    timer.current = window.setTimeout(() => {
      const next = subaccountId ? cloudSamplesRepository.btp.serviceInstances(subaccountId) : [];
      setInstances(next);
      setSyncedAt(new Date().toISOString());
      setRefreshing(false);
      fireToast({ type: 'success', message: `Service instances refreshed: ${next.length} found.` });
    }, 600);
  };

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
        <button type="button" className="mv-secondary-button" onClick={refresh} disabled={refreshing} aria-busy={refreshing}><RefreshIcon size={16} style={{ marginRight: '0.375rem' }} />{refreshing ? 'Refreshing…' : 'Refresh'}</button>
      </div>

      <p className="mv-muted" style={{ marginBottom: '1rem' }}>
        {syncedAt || config?.lastSyncedAt ? `Last synced ${new Date(syncedAt ?? config!.lastSyncedAt!).toLocaleString()}` : 'Not yet synced — click Refresh to discover instances.'}
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
            <table className="mv-table mv-table--stack">
              <thead>
                <tr><th>Instance Name</th><th>Service Offering</th><th>Service Plan</th><th>Platform</th><th>Status</th><th>Created</th><th>Last Synced</th></tr>
              </thead>
              <tbody>
                {instances.map((inst) => (
                  <tr key={inst.id}>
                    <td data-label="Instance Name">{inst.name}</td>
                    <td data-label="Service Offering">{inst.serviceOfferingName}</td>
                    <td data-label="Service Plan" className="mv-code">{inst.servicePlanName}</td>
                    <td data-label="Platform"><span className="mv-status mv-status--neutral">{inst.platformType}</span></td>
                    <td data-label="Status"><span className={`mv-status mv-status--${inst.status.includes('succeeded') ? 'success' : inst.status.includes('failed') ? 'danger' : 'warning'}`}>{inst.status}</span></td>
                    <td data-label="Created">{new Date(inst.createdAtSm).toLocaleDateString()}</td>
                    <td data-label="Last Synced">{new Date(inst.lastSyncedAt).toLocaleDateString()}</td>
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
