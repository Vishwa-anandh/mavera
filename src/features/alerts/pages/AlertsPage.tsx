import { AlertsPanel } from '../components/AlertsPanel';
import { PageHeader } from '../../../shared/ui/PageHeader';

export function AlertsPage() {
  return (
    <div>
      <PageHeader title="Alerts" subtitle="Triage authorised alerts from all active modules." />
      <section className="mv-panel">
        <AlertsPanel />
      </section>
    </div>
  );
}
