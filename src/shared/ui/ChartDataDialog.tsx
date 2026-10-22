import type { ReactNode } from 'react';
import { useModalOverlay } from './useOverlay';

interface ChartDataDialogProps {
  /** Names the dialog and is its heading; use the chart's own name. */
  label: string;
  onClose: () => void;
  children: ReactNode;
  /** A wider dialog for a table with several columns. */
  wide?: boolean;
}

/**
 * The "View data" table behind a chart, in a modal dialog: Escape and the backdrop close it, Tab stays inside,
 * focus moves to the close button when it opens and returns to the control that opened it when it closes
 * (design system 9.1).
 */
export function ChartDataDialog({ label, onClose, children, wide = false }: ChartDataDialogProps) {
  const dialogRef = useModalOverlay<HTMLElement>(onClose);
  return (
    <div className="mv-dialog-backdrop" onClick={onClose}>
      <section ref={dialogRef} className={`mv-dialog${wide ? ' mv-dialog--wide' : ''}`} role="dialog" aria-modal="true" aria-label={label} onClick={(event) => event.stopPropagation()}>
        <div className="mv-panel-header">
          <h2 className="mv-panel-title">{label}</h2>
          <button type="button" className="mv-icon-button" aria-label="Close data table" onClick={onClose} data-autofocus>×</button>
        </div>
        <div className="mv-table-wrap">{children}</div>
      </section>
    </div>
  );
}
