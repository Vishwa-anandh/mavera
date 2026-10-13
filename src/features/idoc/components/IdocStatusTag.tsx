import type { IdocRecord } from '../../../data-access';
import { StatusTag } from '../../../shared/ui/StatusTag';
import { hasPendingRetry } from '../model/idocDerivations';
import { LIFECYCLE_TONE, statusInfo } from '../model/idocStatus';

/** Technical status code with its meaning, toned by lifecycle, plus a "Retry pending" marker. */
export function IdocStatusTag({ record, showMeaning = true }: { record: IdocRecord; showMeaning?: boolean }) {
  const info = statusInfo(record.statusCode);
  return (
    <span className="mv-idoc-status">
      <StatusTag tone={LIFECYCLE_TONE[info.lifecycle]}>{record.statusCode} · {info.lifecycle}</StatusTag>
      {showMeaning && <span className="mv-idoc-status-text">{info.description}</span>}
      {hasPendingRetry(record) && <StatusTag tone="info">Retry pending</StatusTag>}
    </span>
  );
}
