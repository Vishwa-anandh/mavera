import type { IdocRecord } from '../../../data-access';
import { CopyButton } from '../../../shared/ui/CopyButton';
import { DetailDrawer, DetailList } from '../../../shared/ui/DetailDrawer';
import { StatusTag } from '../../../shared/ui/StatusTag';
import { ageMinutes, formatAge, formatDateTime, hasPendingRetry, lifecycleOf } from '../model/idocDerivations';
import { isOpen, statusInfo } from '../model/idocStatus';
import { IdocStatusTag } from './IdocStatusTag';

const PARTNER_TYPE: Record<IdocRecord['partnerType'], string> = { LS: 'Logical system', KU: 'Customer', LI: 'Vendor' };

/**
 * One IDoc: control-record metadata, status history (newest first), retries and the supported
 * recovery action. The payload viewer needs an authorised payload service, so its absence is
 * stated rather than hidden (IDOC-02).
 */
export function IdocDetailDrawer({ record, onClose, onReprocess }: { record: IdocRecord; onClose: () => void; onReprocess?: (record: IdocRecord) => void }) {
  const info = statusInfo(record.statusCode);
  const lifecycle = lifecycleOf(record);
  const canReprocess = lifecycle === 'Failed' && info.reprocessable && !hasPendingRetry(record);
  return (
    <DetailDrawer
      title={`IDoc ${record.docnum}`}
      subtitle={<IdocStatusTag record={record} showMeaning={false} />}
      onClose={onClose}
      footer={
        <>
          <CopyButton value={record.docnum} label="Copy IDoc number" />
          {onReprocess && lifecycle === 'Failed' && (
            <button type="button" className="mv-primary-button" disabled={!canReprocess} onClick={() => onReprocess(record)}>
              Reprocess
            </button>
          )}
        </>
      }
    >
      <p className="mv-detail-lead">{record.statusText}</p>
      {lifecycle === 'Failed' && !info.reprocessable && info.reprocessHint && <p className="mv-notice">{info.reprocessHint}</p>}
      {hasPendingRetry(record) && <p className="mv-notice">A retry was submitted and is pending. SAP hasn’t reported a new status yet.</p>}

      <h3 className="mv-detail-heading">Control record</h3>
      <DetailList
        items={[
          { label: 'Direction', value: record.direction },
          { label: 'System / client', value: `${record.system} / ${record.client}` },
          { label: 'Message type', value: record.messageType },
          { label: 'Basic type', value: record.basicType },
          { label: 'Partner', value: `${record.partner} (${PARTNER_TYPE[record.partnerType]})` },
          { label: 'Sender port', value: record.senderPort },
          { label: 'Receiver port', value: record.receiverPort },
          { label: 'Created', value: formatDateTime(record.createdAt) },
          { label: 'Last update', value: formatDateTime(record.updatedAt) },
          { label: isOpen(lifecycle) ? 'Waiting for' : 'Processing time', value: isOpen(lifecycle) ? formatAge(ageMinutes(record)) : record.durationSeconds !== null ? `${record.durationSeconds} s` : 'Not measured' },
          ...(record.errorCategory ? [{ label: 'Error category', value: record.errorCategory }] : []),
        ]}
      />

      <h3 className="mv-detail-heading">Status history</h3>
      <ol className="mv-timeline">
        {[...record.history].reverse().map((event) => (
          <li key={`${event.at}-${event.code}`}>
            <span className="mv-timeline-code">{event.code}</span>
            <span>
              <strong>{statusInfo(event.code).description}</strong>
              {event.text && event.text !== statusInfo(event.code).description && <span className="mv-muted">{event.text}</span>}
              <span className="mv-muted">{formatDateTime(event.at)}</span>
            </span>
          </li>
        ))}
      </ol>

      <h3 className="mv-detail-heading">Retries</h3>
      {record.retries.length === 0 ? (
        <p className="mv-muted">No retries.</p>
      ) : (
        <ul className="mv-retry-list">
          {record.retries.map((retry) => (
            <li key={retry.at}>
              <StatusTag tone={retry.result === 'Pending' ? 'info' : retry.result === 'Succeeded' ? 'success' : 'danger'}>{retry.result}</StatusTag>
              <span className="mv-muted">{formatDateTime(retry.at)}{retry.code ? ` · ended in status ${retry.code}` : ''}</span>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mv-detail-heading">Payload</h3>
      <p className="mv-muted">The payload viewer needs the IDoc payload service, which isn’t connected in this build.</p>
    </DetailDrawer>
  );
}
