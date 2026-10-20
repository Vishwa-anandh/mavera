import type { NoteHistoryEntry, NoteHistoryKind } from '../../../data-access';
import { DetailDrawer } from '../../../shared/ui/DetailDrawer';
import { StatusTag, type StatusTone } from '../../../shared/ui/StatusTag';
import { formatStampWithYear } from '../model/sapFormat';

const KIND_LABEL: Record<NoteHistoryKind, string> = { upload: 'Upload', check: 'Check', recheck: 'Recheck', delete: 'Delete' };
const KIND_TONE: Record<NoteHistoryKind, StatusTone> = { upload: 'info', check: 'success', recheck: 'neutral', delete: 'danger' };

/** Everything that was uploaded, checked or deleted, newest first, with who did it and the counts. */
export function NotesHistoryDrawer({ entries, onClose }: { entries: NoteHistoryEntry[]; onClose: () => void }) {
  return (
    <DetailDrawer title="Notes history" subtitle="Uploads, status checks and deletions" onClose={onClose}>
      {entries.length === 0 ? (
        <p className="mv-muted">Nothing has been uploaded, checked or deleted yet.</p>
      ) : (
        <ol className="mv-history-list" aria-label="Security notes history">
          {entries.map((entry) => (
            <li key={entry.id} className="mv-history-item">
              <div className="mv-history-meta">
                <StatusTag tone={KIND_TONE[entry.kind]}>{KIND_LABEL[entry.kind]}</StatusTag>
                <time className="mv-muted" dateTime={entry.at}>{formatStampWithYear(entry.at)}</time>
              </div>
              <p className="mv-history-summary">{entry.summary}</p>
              <p className="mv-muted mv-history-actor">By {entry.actor}</p>
              <ul className="mv-count-chips" aria-label="Counts">
                {entry.counts.map((count) => <li key={count.label}><strong>{count.value}</strong> {count.label}</li>)}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </DetailDrawer>
  );
}
