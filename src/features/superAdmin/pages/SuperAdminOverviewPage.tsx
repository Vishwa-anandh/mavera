import { useNavigate } from 'react-router-dom';
import { useSuperAdminAuth } from '../model/SuperAdminAuthContext';
import { useOrganizations } from '../model/organizationsStore';
import type { Organization } from '../model/superAdminTypes';
import { useBilling } from '../../billing';
import { formatCurrency, formatDate } from '../../../shared/domain/billing/billingDerivations';
import { StatusPill } from '../../billing';
import { ModuleCard, type MeterSegment } from '../../../shared/ui/ModuleCard';
import { BuildingIcon, CreditCardIcon, ClockIcon, PlusIcon } from '../../../shared/ui/icons';

const METER_LENGTH = 24;

function daysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - new Date('2026-09-27').getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function orgUrgency(expiresAt: string | null): 'crit' | 'warn' | 'ok' {
  const d = daysLeft(expiresAt);
  if (d === null) return 'ok';
  if (d <= 7) return 'crit';
  if (d <= 30) return 'warn';
  return 'ok';
}

/** A meter cell per organization, worst-expiry first — same convention as
 * the org dashboard's SAP health meter (one segment per system). */
function orgMeterSegments(orgs: Organization[]): MeterSegment[] {
  const order: Record<string, number> = { crit: 0, warn: 1, ok: 2 };
  return [...orgs].sort((a, b) => order[orgUrgency(a.expiresAt)] - order[orgUrgency(b.expiresAt)]).map((o) => orgUrgency(o.expiresAt));
}

/** A single fill/empty meter proportional to collected-vs-total revenue —
 * same convention as the org dashboard's cloud-spend-vs-forecast meter. */
function billingMeterSegments(collected: number, total: number): MeterSegment[] {
  if (total <= 0) return Array<MeterSegment>(METER_LENGTH).fill('empty');
  const filled = Math.round((collected / total) * METER_LENGTH);
  return [...Array(filled).fill('fill' as MeterSegment), ...Array(METER_LENGTH - filled).fill('empty' as MeterSegment)];
}

/**
 * Landing page for the Super Admin portal — a cross-cutting overview of both
 * Organizations and Billing (the portal's only two areas), styled as the
 * same "operations pulse" deck the org app's own Dashboard opens with,
 * rather than dropping straight into a management table. Those tables live
 * at /admin/organizations and /admin/billing.
 */
export function SuperAdminOverviewPage() {
  const navigate = useNavigate();
  const { username } = useSuperAdminAuth();
  const { invoices, customers } = useBilling();

  const orgs = useOrganizations();
  const totalOrgs = orgs.length;
  const expiringOrgs = orgs
    .map((o) => ({ org: o, days: daysLeft(o.expiresAt) }))
    .filter((x): x is { org: typeof orgs[number]; days: number } => x.days !== null && x.days >= 0 && x.days <= 30)
    .sort((a, b) => a.days - b.days);
  const seatsGranted = orgs.reduce((sum, o) => sum + (o.maxUsers === 0 ? 0 : o.maxUsers), 0);

  const outstanding = invoices.filter((inv) => inv.status === 'Sent' || inv.status === 'Overdue');
  const outstandingTotal = outstanding.reduce((sum, inv) => sum + inv.totalDue, 0);
  const overdueCount = invoices.filter((inv) => inv.status === 'Overdue').length;
  const revenueTotal = invoices.filter((inv) => inv.status === 'Paid').reduce((sum, inv) => sum + inv.totalDue, 0);
  const billingTotal = revenueTotal + outstandingTotal;

  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())
    .slice(0, 5);

  const customerName = (customerId: string) => customers.find((c) => c.id === customerId)?.name ?? 'Unknown customer';

  return (
    <div className="mv-sa-content">
      <section className="mv-pulse" aria-labelledby="sa-pulse-title">
        <div className="mv-pulse-head">
          <div>
            <p className="mv-pulse-greeting">Signed in as {username}</p>
            <h1 id="sa-pulse-title" className="mv-pulse-title">Dashboard</h1>
          </div>
        </div>
        <div className="mv-pulse-grid">
          <ModuleCard
            title="Organizations"
            icon={BuildingIcon}
            subscribed
            meter={{ segments: orgMeterSegments(orgs), caption: `${expiringOrgs.length} expiring within 30 days across ${totalOrgs} organizations` }}
            metrics={[
              { label: 'Total', value: String(totalOrgs) },
              { label: 'Expiring soon', value: String(expiringOrgs.length) },
              { label: 'Seats granted', value: seatsGranted.toLocaleString() },
            ]}
            actionLabel="Manage Organizations"
            actionPath="/admin/organizations"
          />
          <ModuleCard
            title="Billing"
            icon={CreditCardIcon}
            subscribed
            meter={{ segments: billingMeterSegments(revenueTotal, billingTotal), caption: billingTotal > 0 ? `${Math.round((revenueTotal / billingTotal) * 100)}% of ${formatCurrency(billingTotal)} invoiced collected` : 'No invoices yet' }}
            metrics={[
              { label: 'Outstanding', value: formatCurrency(outstandingTotal) },
              { label: 'Collected', value: formatCurrency(revenueTotal) },
              { label: 'Overdue', value: String(overdueCount) },
            ]}
            actionLabel="Open Billing"
            actionPath="/admin/billing"
          />
        </div>
      </section>

      <div className="mv-columns-16-8">
        <section className="mv-panel">
          <div className="mv-panel-header">
            <h2 className="mv-panel-title"><CreditCardIcon size={16} style={{ verticalAlign: -3, marginRight: '0.375rem' }} />Recent Invoices</h2>
            <button className="mv-quiet-button" onClick={() => navigate('/admin/billing')}>View all</button>
          </div>
          {recentInvoices.length === 0 ? (
            <p className="mv-muted">No invoices yet.</p>
          ) : (
            <div className="mv-table-wrap">
              <table className="mv-table">
                <thead><tr><th>Invoice</th><th>Organization</th><th>Date</th><th>Status</th><th aria-label="Amount" /></tr></thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td><strong>{inv.invoiceNumber}</strong></td>
                      <td>{customerName(inv.customerId)}</td>
                      <td>{formatDate(inv.invoiceDate)}</td>
                      <td><StatusPill status={inv.status} /></td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(inv.totalDue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ marginTop: '0.875rem' }}>
            <button className="mv-primary-button" onClick={() => navigate('/admin/billing/generate')}><PlusIcon size={16} style={{ marginRight: '0.375rem' }} />New Invoice</button>
          </div>
        </section>

        <section className="mv-panel">
          <div className="mv-panel-header">
            <h2 className="mv-panel-title"><ClockIcon size={16} style={{ verticalAlign: -3, marginRight: '0.375rem' }} />Expiring Soon</h2>
            <button className="mv-quiet-button" onClick={() => navigate('/admin/organizations')}>View all</button>
          </div>
          {expiringOrgs.length === 0 ? (
            <p className="mv-muted">No organizations expiring in the next 30 days.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.625rem' }}>
              {expiringOrgs.map(({ org, days }) => (
                <div key={org.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div><strong>{org.name}</strong><div className="mv-muted">{org.memberCount} members</div></div>
                  <span className={`mv-status ${days <= 7 ? 'mv-status--danger' : 'mv-status--warning'}`}>{days}d left</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: '0.875rem' }}>
            <button className="mv-secondary-button" onClick={() => navigate('/admin/organizations')}><BuildingIcon size={16} style={{ marginRight: '0.375rem' }} />Manage Organizations</button>
          </div>
        </section>
      </div>
    </div>
  );
}
