import type { ReactNode } from 'react';
import { useId } from 'react';

/**
 * A titled group of panels on a long detail view (for example the Technical view of a cloud account):
 * a heading with a one line description, then the group's panels stacked under it. Groups replace extra
 * tab bars; the panels inside should use `h3` titles so the outline reads page > group > panel.
 */
export function DetailGroup({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className="mv-detail-group" aria-labelledby={id}>
      <header className="mv-detail-group-head">
        <h2 className="mv-detail-group-title" id={id}>{title}</h2>
        {description && <p className="mv-muted">{description}</p>}
      </header>
      <div className="mv-detail-group-body">{children}</div>
    </section>
  );
}
