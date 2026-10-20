import { Link } from 'react-router-dom';
import type { SapDump } from '../../../data-access';
import { CheckIcon } from '../../../shared/ui/icons';
import { TcodeBadge } from './TcodeBadge';

/** ABAP Runtime Errors (ST22): a calm "running clean" line when there are none, a short list when there are. */
export function AbapRuntimeErrorsCard({ errors }: { errors: SapDump[] }) {
  return (
    <section className="mv-panel mv-panel--flat" aria-labelledby="abap-errors-title">
      <div className="mv-panel-header">
        <h2 id="abap-errors-title" className="mv-panel-title">ABAP Runtime Errors <TcodeBadge code="ST22" /></h2>
        <Link className="mv-quiet-button" to="/sap/jobs#dumps">Open Jobs &amp; Dumps</Link>
      </div>
      {errors.length === 0 ? (
        <p className="mv-clean-line" role="status">
          <CheckIcon size={16} aria-hidden="true" />
          No runtime errors, system is running clean
        </p>
      ) : (
        <>
          <p className="mv-muted" style={{ margin: '0 0 0.5rem' }}>{errors.length} runtime {errors.length === 1 ? 'error' : 'errors'} in the selected period</p>
          <ul className="mv-error-list" aria-label="ABAP runtime errors">
            {errors.map((error) => (
              <li key={error.id}>
                <strong>{error.program}</strong>
                <span>{error.errorType}</span>
                <span className="mv-muted">{error.occurredAt} · {error.user}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
