import { Link } from 'react-router-dom';
import { BuildingIcon, PlusIcon } from '../../../shared/ui/icons';
import { ExpiryBadge, ModuleChips } from '../components/OrgStatus';
import { daysLeft } from '../model/orgDates';
import { useOrganizations } from '../model/organizationsStore';
import { PageHeader } from '../../../shared/ui/PageHeader';

/**
 * Super Admin's Organizations list: every customer org with its modules, seats, cloud access
 * and expiry. "Manage" and "New organization" open full pages (SuperAdminOrganizationPage)
 * rather than dialogs, so the whole subscription fits on screen and has its own URL.
 */
export function SuperAdminOrganizationsPage() {
  const orgs = useOrganizations();

  const totalOrgs = orgs.length;
  const totalSeatsGranted = orgs.reduce((sum, o) => sum + (o.maxUsers === 0 ? 0 : o.maxUsers), 0);
  const expiringSoon = orgs.filter((o) => { const d = daysLeft(o.expiresAt); return d !== null && d >= 0 && d <= 30; }).length;
  const allModulesCount = orgs.filter((o) => o.modules.cloudCost && o.modules.sapMonitoring).length;

  return (
    <div className="mv-sa-content">
      <PageHeader title="Organizations" subtitle="Each customer's modules, seats, cloud access and subscription period. Only super admins can change these.">
        <Link className="mv-primary-button" to="/admin/organizations/new"><PlusIcon size={16} style={{ marginRight: '0.375rem' }} />New organization</Link>
      </PageHeader>

      <div className="mv-kpi-row-4" style={{ marginBottom: '1.5rem' }}>
        <article className="mv-kpi"><span className="mv-kpi-label">Organizations</span><strong className="mv-kpi-value">{totalOrgs}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Seats granted (capped orgs)</span><strong className="mv-kpi-value">{totalSeatsGranted.toLocaleString()}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Expiring within 30 days</span><strong className="mv-kpi-value">{expiringSoon}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Subscribed to both modules</span><strong className="mv-kpi-value">{allModulesCount}</strong></article>
      </div>

      <section className="mv-panel">
        <div className="mv-panel-header">
          <h2 className="mv-panel-title"><BuildingIcon size={16} style={{ verticalAlign: -3, marginRight: '0.375rem' }} />All organizations</h2>
        </div>
        <div className="mv-table-wrap">
          <table className="mv-table mv-table--stack">
            <thead>
              <tr>
                <th>Organization</th>
                <th>Modules</th>
                <th>Users</th>
                <th>Cloud access</th>
                <th>Expiry</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id}>
                  <td data-label="Organization" className="mv-stack-title"><strong>{org.name}</strong><div className="mv-muted">{org.memberCount} members</div></td>
                  <td data-label="Modules"><ModuleChips modules={org.modules} /></td>
                  <td data-label="Users">{org.maxUsers === 0 ? 'Unlimited' : `${org.maxUsers} seats`}</td>
                  <td data-label="Cloud access">{org.invoiceOnly ? 'Invoice only' : org.cloudAccess.length ? org.cloudAccess.map((c) => c.toUpperCase()).join(', ') : '—'}</td>
                  <td data-label="Expiry"><ExpiryBadge expiresAt={org.expiresAt} /></td>
                  <td className="mv-stack-actions">
                    <Link className="mv-quiet-button" to={`/admin/organizations/${org.id}`} aria-label={`Manage ${org.name}`}>Manage</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
