import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import { SAP_ABAP_RUNTIME_ERRORS } from '../../../demo/sap/mockSapPerformance';
import { AlertTriangleIcon } from '../../../shared/ui/icons';
import { DestinationSwitcher } from '../components/DestinationSwitcher';

export function SapDumpsPage() {
  return (
    <div>
      <AppBreadcrumb items={[{ label: 'SAP Monitoring', path: '/sap/systems' }, { label: 'Dumps' }]} />
      <div className="mv-page-heading">
        <div><h1 className="mv-title">Dumps</h1><p className="mv-subtitle">ABAP runtime errors (ST22) across your connected systems.</p></div>
        <DestinationSwitcher />
      </div>

      <section className="mv-panel">
        <div className="mv-panel-header"><h2 className="mv-panel-title"><AlertTriangleIcon size={16} style={{ verticalAlign: -3, marginRight: 6 }} />ABAP Runtime Errors <span className="mv-muted" style={{ fontWeight: 400 }}>ST22</span></h2></div>
        {SAP_ABAP_RUNTIME_ERRORS.length === 0 ? (
          <p className="mv-muted">No runtime errors — system is running clean.</p>
        ) : (
          <div className="mv-table-wrap">
            <table className="mv-table">
              <thead><tr><th>Program</th><th>Error Type</th><th>Occurred</th><th>User</th></tr></thead>
              <tbody>
                {SAP_ABAP_RUNTIME_ERRORS.map((err) => (
                  <tr key={err.id}><td>{err.program}</td><td>{err.errorType}</td><td>{err.occurredAt}</td><td>{err.user}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
