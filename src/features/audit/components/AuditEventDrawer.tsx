import type { AuditEventRecord } from '../../../data-access';
import { DetailDrawer, DetailList } from '../../../shared/ui/DetailDrawer';
import { CopyButton } from '../../../shared/ui/CopyButton';
import { RESULT_LABELS, RESULT_TONES, formatDateTime } from '../model/auditDerivations';

/** Everything recorded about one event; permission and role changes show their before and after values. */
export function AuditEventDrawer({ event, onClose }: { event: AuditEventRecord; onClose: () => void }) {
  return (
    <DetailDrawer
      title={event.action}
      subtitle={<span className={`mv-status mv-status--${RESULT_TONES[event.result]}`}>{RESULT_LABELS[event.result]}</span>}
      onClose={onClose}
      footer={<CopyButton value={event.id} label="Copy event ID" />}
    >
      {event.detail && <p className="mv-audit-detail">{event.detail}</p>}

      <h3 className="mv-detail-heading">Event</h3>
      <DetailList
        items={[
          { label: 'When', value: formatDateTime(event.at) },
          { label: 'Target', value: event.target },
          { label: 'Module', value: event.module },
          { label: 'Result', value: RESULT_LABELS[event.result] },
          ...(event.source ? [{ label: 'Source', value: event.source }] : []),
          { label: 'Event ID', value: event.id },
        ]}
      />

      <h3 className="mv-detail-heading">Actor</h3>
      <DetailList
        items={[
          { label: 'Name', value: event.actorName },
          { label: 'Email', value: event.actorEmail || '—' },
          { label: 'Role', value: event.actorRole },
          { label: 'Type', value: event.actorKind === 'admin' ? 'Admin' : 'Member' },
        ]}
      />

      {event.changes && event.changes.length > 0 && (
        <>
          <h3 className="mv-detail-heading">What changed</h3>
          <table className="mv-table mv-audit-changes">
            <caption className="mv-sr-only">Values before and after this change</caption>
            <thead>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">Before</th>
                <th scope="col">After</th>
              </tr>
            </thead>
            <tbody>
              {event.changes.map((change) => (
                <tr key={change.field}>
                  <th scope="row">{change.field}</th>
                  <td className="mv-audit-before">{change.before}</td>
                  <td className="mv-audit-after">{change.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </DetailDrawer>
  );
}
