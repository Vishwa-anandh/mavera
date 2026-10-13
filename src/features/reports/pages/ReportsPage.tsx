import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';

export function ReportsPage() {
  return (
    <div>
      <AppBreadcrumb items={[{ label: 'Cloud Cost', path: '/cloud/overview' }, { label: 'Reports' }]} />
      <div className="mv-page-heading">
        <div>
          <h1 className="mv-title">Reports</h1>
          <p className="mv-subtitle">Generate and retrieve reports across permitted modules.</p>
        </div>
      </div>
      <section className="mv-panel">
        <p className="mv-muted">Report generation isn't connected in this prototype build yet.</p>
      </section>
    </div>
  );
}
