import { Link } from 'react-router-dom';
import { useAuth } from '../../auth';
import { CrownIcon, ServerIcon, CloudIcon, BellIcon, ReportIcon, SettingsIcon, HeadsetIcon } from '../../../shared/ui/icons';

const QUICK_ACCESS = [
  { key: 'sap', label: 'Add SAP System', path: '/sap/systems', icon: ServerIcon, module: 'sapMonitoring' as const },
  { key: 'azure', label: 'Add Azure Subscription', path: '/cloud/overview', icon: CloudIcon, module: 'cloudCost' as const },
  { key: 'alerts', label: 'Manage Alerts', path: '/alerts', icon: BellIcon },
  { key: 'reports', label: 'Generate Report', path: '/cloud/analytics', icon: ReportIcon },
  { key: 'settings', label: 'Settings', path: '/account', icon: SettingsIcon },
];

/**
 * Persistent left column beside the dashboard's main content — subscription
 * status, quick shortcuts and support, matching the reference layout's left
 * rail exactly (structure only; copy and colours are ours). Both the
 * subscription summary and the quick-access list read the org's module
 * entitlements (set by the super admin), so an org on fewer than both
 * modules doesn't see shortcuts into ones it can't open.
 */
export function DashboardSidebar() {
  const { modules } = useAuth();
  const activeCount = Number(modules.cloudCost) + Number(modules.sapMonitoring);
  const quickAccess = QUICK_ACCESS.filter((item) => !item.module || modules[item.module]);

  return (
    <div className="mv-dashboard-sidebar">
      <section className="mv-side-card mv-side-subscription">
        <div className="mv-side-card-header"><CrownIcon size={18} /><span>Your Subscription</span></div>
        <div className="mv-side-plan-row">
          <strong>Enterprise Plan</strong>
          <span className="mv-status mv-status--success">Active</span>
        </div>
        <p className="mv-muted" style={{ margin: '6px 0 12px' }}>{activeCount} of 2 modules active</p>
        <Link className="mv-quiet-button" to="/subscription">View subscription</Link>
      </section>

      <section className="mv-side-card">
        <div className="mv-side-card-header"><span>Quick Access</span></div>
        <nav className="mv-quick-access-list">
          {quickAccess.map((item) => (
            <Link key={item.key} to={item.path}>
              <item.icon size={17} />
              {item.label}
            </Link>
          ))}
        </nav>
      </section>

      <section className="mv-side-card mv-side-help">
        <HeadsetIcon size={20} />
        <div>
          <strong>Need Help?</strong>
          <a href="https://www.maitsys.com/contact-us" target="_blank" rel="noopener noreferrer">Contact Support</a>
        </div>
      </section>
    </div>
  );
}
