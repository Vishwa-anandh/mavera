import { PageHeader } from '../../../shared/ui/PageHeader';

interface ComingSoonPageProps {
  title: string;
  description?: string;
}

/**
 * Shared placeholder for the destinations MAVERA_DESIGN_SYSTEM.md requires
 * in navigation but this build hasn't implemented yet — keeps the shared
 * page anatomy (§6.3: title, description) so the page reads as
 * "not built yet", not broken.
 */
export function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return (
    <div>
      <PageHeader title={title} subtitle={description ?? 'This page is coming in a later phase.'} />
      <section className="mv-panel">
        <p className="mv-muted">There's nothing to show yet — this destination isn't built in this prototype.</p>
      </section>
    </div>
  );
}
