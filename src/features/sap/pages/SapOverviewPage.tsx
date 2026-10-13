import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import { SapSystemsPanel } from '../components/SapSystemsPanel';
import { DestinationSwitcher } from '../components/DestinationSwitcher';

export function SapOverviewPage() {
  return (
    <div>
      <AppBreadcrumb items={[{ label: 'SAP Monitoring', path: '/sap/systems' }, { label: 'SAP System Monitoring' }]} />
      <div className="mv-page-heading">
        <div>
          <h1 className="mv-title">SAP System Monitoring</h1>
          <p className="mv-subtitle">Find systems that require attention.</p>
        </div>
        <DestinationSwitcher />
      </div>
      <section className="mv-panel">
        <SapSystemsPanel />
      </section>
    </div>
  );
}
