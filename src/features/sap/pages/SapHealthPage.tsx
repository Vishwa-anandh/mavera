import { Link } from 'react-router-dom';
import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import { SapSystemsPanel } from '../components/SapSystemsPanel';
import { HANA_SYSTEM } from '../../../demo/sap/mockHanaData';
import { SAP_PERFORMANCE } from '../../../demo/sap/mockSapPerformance';
import { MOCK_SAP_ALERTS } from '../../../demo/sap/mockSapAlerts';
import { DestinationSwitcher } from '../components/DestinationSwitcher';

/** Consolidated at-a-glance snapshot across HANA, ABAP performance and open
 * alerts — a landing summary above the deeper per-topic pages. */
export function SapHealthPage() {
  const unreadAlerts = MOCK_SAP_ALERTS.filter((a) => !a.read).length;

  return (
    <div>
      <AppBreadcrumb items={[{ label: 'SAP Monitoring', path: '/sap/systems' }, { label: 'System Health' }]} />
      <div className="mv-page-heading">
        <div><h1 className="mv-title">System Health</h1><p className="mv-subtitle">At-a-glance status across HANA, ABAP performance and open alerts.</p></div>
        <DestinationSwitcher />
      </div>

      <div className="mv-kpi-row-4" style={{ marginBottom: 20 }}>
        <article className="mv-kpi"><span className="mv-kpi-label">HANA Memory</span><strong className="mv-kpi-value">{HANA_SYSTEM.memory.percent}%</strong><span className="mv-status mv-status--success">Healthy</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">ABAP Response Time</span><strong className="mv-kpi-value">{SAP_PERFORMANCE.responseTimeMs}ms</strong><span className="mv-status mv-status--success">{SAP_PERFORMANCE.status}</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Work Processes</span><strong className="mv-kpi-value">{SAP_PERFORMANCE.workProcessesUsed}/{SAP_PERFORMANCE.workProcessesTotal}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Unread Alerts</span><strong className="mv-kpi-value">{unreadAlerts}</strong>{unreadAlerts > 0 && <Link className="mv-quiet-button" to="/sap/alerts">View all</Link>}</article>
      </div>

      <section className="mv-panel">
        <div className="mv-panel-header"><h2 className="mv-panel-title">Systems</h2><Link className="mv-quiet-button" to="/sap/systems">View full fleet</Link></div>
        <SapSystemsPanel limit={5} />
      </section>
    </div>
  );
}
