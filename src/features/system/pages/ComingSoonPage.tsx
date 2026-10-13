import { AppBreadcrumb, type BreadcrumbItem } from '../../../shared/ui/AppBreadcrumb';

interface ComingSoonPageProps {
  title: string;
  description?: string;
  breadcrumb: BreadcrumbItem[];
}

/**
 * Shared placeholder for the destinations MAVERA_DESIGN_SYSTEM.md requires
 * in navigation but this build hasn't implemented yet — keeps the shared
 * page anatomy (§6.3: breadcrumb, title, description) so the page reads as
 * "not built yet", not broken.
 */
export function ComingSoonPage({ title, description, breadcrumb }: ComingSoonPageProps) {
  return (
    <div>
      <AppBreadcrumb items={breadcrumb} />
      <div className="mv-page-heading">
        <div>
          <h1 className="mv-title">{title}</h1>
          <p className="mv-subtitle">{description ?? 'This page is coming in a later phase.'}</p>
        </div>
      </div>
      <section className="mv-panel">
        <p className="mv-muted">There's nothing to show yet — this destination isn't built in this prototype.</p>
      </section>
    </div>
  );
}
