import { useEffect, useRef, type ReactNode } from 'react';

interface ChartDataDialogProps {
  /** Names the dialog and is its heading; use the chart's own name. */
  label: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * The "View data" table behind a chart, in a modal dialog: Escape and the backdrop close it, focus moves to the close
 * button when it opens and returns to the control that opened it when it closes (design system 9.1).
 */
export function ChartDataDialog({ label, onClose, children }: ChartDataDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, []);

  return (
    <div className="mv-dialog-backdrop" onClick={onClose}>
      <section className="mv-dialog" role="dialog" aria-modal="true" aria-label={label} onClick={(event) => event.stopPropagation()}>
        <div className="mv-panel-header">
          <h2 className="mv-panel-title">{label}</h2>
          <button ref={closeRef} type="button" className="mv-icon-button" aria-label="Close data table" onClick={onClose}>×</button>
        </div>
        <div className="mv-table-wrap">{children}</div>
      </section>
    </div>
  );
}
