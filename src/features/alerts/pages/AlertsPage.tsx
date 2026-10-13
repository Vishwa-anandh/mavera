import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import { AlertsPanel } from '../components/AlertsPanel';

export function AlertsPage() {
  return (
    <div>
      <AppBreadcrumb items={[{ label: 'Alerts' }]} />
      <div className="mv-page-heading">
        <div>
          <h1 className="mv-title">Alerts</h1>
          <p className="mv-subtitle">Triage authorised alerts from all active modules.</p>
        </div>
      </div>
      <section className="mv-panel">
        <AlertsPanel />
      </section>
    </div>
  );
}
