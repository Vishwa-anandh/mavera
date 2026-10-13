import type { IdocRecord } from '../../../data-access';
import { ageMinutes, formatAge, formatDateTime } from '../model/idocDerivations';
import { IdocStatusTag } from './IdocStatusTag';

interface IdocRecordTableProps {
  records: IdocRecord[];
  caption: string;
  onOpen: (record: IdocRecord) => void;
  /** Adds a checkbox column for bulk actions. */
  selection?: { selected: Set<string>; onToggle: (docnum: string) => void; onToggleAll: (docnums: string[]) => void; isSelectable: (record: IdocRecord) => boolean };
  showDirection?: boolean;
  /** "age" shows time since creation instead of the last-update time. */
  timeColumn?: 'updated' | 'age';
}

/** The IDoc worklist used across the IDoc pages. The IDoc number opens the detail drawer. */
export function IdocRecordTable({ records, caption, onOpen, selection, showDirection = true, timeColumn = 'updated' }: IdocRecordTableProps) {
  const selectable = selection ? records.filter(selection.isSelectable).map((r) => r.docnum) : [];
  const allSelected = selection && selectable.length > 0 && selectable.every((docnum) => selection.selected.has(docnum));
  return (
    <div className="mv-table-wrap">
      <table className="mv-table mv-table--stack mv-idoc-table">
        <caption className="mv-sr-only">{caption}</caption>
        <thead>
          <tr>
            {selection && (
              <th className="mv-col-check">
                <input type="checkbox" aria-label="Select all IDocs that can be reprocessed" checked={Boolean(allSelected)} disabled={selectable.length === 0} onChange={() => selection.onToggleAll(selectable)} />
              </th>
            )}
            <th>IDoc number</th>
            {showDirection && <th className="mv-hide-phone">Direction</th>}
            <th>Message type</th>
            <th>Partner</th>
            <th>Status</th>
            <th className="mv-hide-phone">Created</th>
            <th>{timeColumn === 'age' ? 'Age' : 'Last update'}</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.docnum} className={selection?.selected.has(record.docnum) ? 'is-selected' : undefined}>
              {selection && (
                <td className="mv-col-check" data-label="Select">
                  <input
                    type="checkbox"
                    aria-label={`Select IDoc ${record.docnum}`}
                    checked={selection.selected.has(record.docnum)}
                    disabled={!selection.isSelectable(record)}
                    onChange={() => selection.onToggle(record.docnum)}
                  />
                </td>
              )}
              <td className="mv-stack-title">
                <button type="button" className="mv-link-button mv-mono" onClick={() => onOpen(record)}>{record.docnum}</button>
              </td>
              {showDirection && <td className="mv-hide-phone" data-label="Direction">{record.direction}</td>}
              <td data-label="Message type">{record.messageType}<div className="mv-muted">{record.basicType}</div></td>
              <td data-label="Partner">{record.partner}<div className="mv-muted">{record.partnerType}</div></td>
              <td data-label="Status" className="mv-idoc-status-cell"><IdocStatusTag record={record} /></td>
              <td className="mv-hide-phone" data-label="Created">{formatDateTime(record.createdAt)}</td>
              <td data-label={timeColumn === 'age' ? 'Age' : 'Last update'}>{timeColumn === 'age' ? formatAge(ageMinutes(record)) : formatDateTime(record.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
