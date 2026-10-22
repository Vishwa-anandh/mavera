import { useNavigate } from 'react-router-dom';
import { AlertsPanel } from '../components/AlertsPanel';
import { useGlobalAlerts } from '../model/useGlobalAlerts';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { BellIcon } from '../../../shared/ui/icons';
import { useConnectionStatus } from '../../workspace';

export function AlertsPage() {
  const rows = useGlobalAlerts();
  const navigate = useNavigate();
  const { nothingConnected, firstStep, connectFirst } = useConnectionStatus();

  return (
    <div>
      <PageHeader title="Alerts" subtitle="Triage authorised alerts from all active modules." />
      <section className="mv-panel">
        {rows.length > 0 ? (
          <AlertsPanel rows={rows} />
        ) : nothingConnected ? (
          <EmptyState
            icon={<BellIcon size={28} />}
            heading="No alerts yet"
            explanation="Alerts appear here once an account or SAP system is connected and monitoring starts."
            actionLabel={firstStep.label}
            onAction={connectFirst}
          />
        ) : (
          <EmptyState
            icon={<BellIcon size={28} />}
            heading="No active alerts"
            explanation="Nothing needs attention right now. Tune what raises an alert in Smart Alerts."
            actionLabel="Review alert settings"
            onAction={() => navigate('/smart-alerts')}
          />
        )}
      </section>
    </div>
  );
}
