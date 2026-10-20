import { useState, type ReactNode } from 'react';
import { useModalOverlay } from '../../../shared/ui/useOverlay';

export interface DataColumn {
  header: string;
  numeric?: boolean;
}

interface ChartDataDialogProps {
  title: string;
  columns: DataColumn[];
  rows: ReactNode[][];
  onClose: () => void;
}

/** The "View data" table that sits behind every chart: same numbers, readable by keyboard and screen reader. */
export function ChartDataDialog({ title, columns, rows, onClose }: ChartDataDialogProps) {
  const panelRef = useModalOverlay<HTMLElement>(onClose);
  return (
    <div className="mv-dialog-backdrop" onClick={onClose}>
      <section ref={panelRef} className="mv-dialog mv-dialog--wide" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="mv-panel-header">
          <h2 className="mv-panel-title">{title}</h2>
          <button type="button" className="mv-icon-button" aria-label="Close data table" onClick={onClose}>×</button>
        </div>
        <div className="mv-table-wrap">
          <table className="mv-table">
            <thead>
              <tr>{columns.map((c) => <th key={c.header} className={c.numeric ? 'mv-num' : undefined}>{c.header}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>{row.map((cell, j) => <td key={j} className={columns[j]?.numeric ? 'mv-num' : undefined}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/** A "View data" button that opens its dialog; keeps the open state out of the chart components. */
export function ViewDataButton({ title, columns, rows }: Omit<ChartDataDialogProps, 'onClose'>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="mv-quiet-button" aria-haspopup="dialog" onClick={() => setOpen(true)}>View data</button>
      {open && <ChartDataDialog title={title} columns={columns} rows={rows} onClose={() => setOpen(false)} />}
    </>
  );
}
