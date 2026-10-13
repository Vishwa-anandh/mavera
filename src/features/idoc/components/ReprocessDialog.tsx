import type { IdocRecord } from '../../../data-access';
import { useModalOverlay } from '../../../shared/ui/useOverlay';
import { statusInfo } from '../model/idocStatus';

/**
 * Confirmation before reprocessing: names every selected IDoc with its current status and the
 * action that will run (IDOC-03), and says plainly that the result arrives later.
 */
export function ReprocessDialog({ records, onCancel, onConfirm }: { records: IdocRecord[]; onCancel: () => void; onConfirm: () => void }) {
  const panelRef = useModalOverlay<HTMLElement>(onCancel);
  return (
    <div className="mv-dialog-backdrop" onClick={onCancel}>
      <section ref={panelRef} className="mv-dialog" role="alertdialog" aria-modal="true" aria-labelledby="reprocess-title" aria-describedby="reprocess-desc" onClick={(e) => e.stopPropagation()}>
        <h2 className="mv-panel-title" id="reprocess-title">Reprocess {records.length} IDoc{records.length === 1 ? '' : 's'}?</h2>
        <p className="mv-subtitle" id="reprocess-desc">
          SAP will try to post {records.length === 1 ? 'this IDoc' : 'these IDocs'} again (BD87). Each retry shows as Pending until SAP reports the new status.
        </p>
        <ul className="mv-reprocess-list">
          {records.map((r) => (
            <li key={r.docnum}>
              <span className="mv-mono">{r.docnum}</span>
              <span className="mv-muted">{r.messageType} · {r.partner} · status {r.statusCode} ({statusInfo(r.statusCode).description})</span>
            </li>
          ))}
        </ul>
        <div className="mv-dialog-actions">
          <button type="button" className="mv-secondary-button" onClick={onCancel} data-autofocus>Cancel</button>
          <button type="button" className="mv-primary-button" onClick={onConfirm}>Reprocess {records.length === 1 ? 'IDoc' : `${records.length} IDocs`}</button>
        </div>
      </section>
    </div>
  );
}
