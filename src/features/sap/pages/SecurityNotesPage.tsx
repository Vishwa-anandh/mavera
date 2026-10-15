import { useRef, useState } from 'react';
import { useRememberedState } from '../../../shared/lib/useRememberedState';
import { MOCK_SECURITY_NOTES, MOCK_NOTE_UPLOAD_HISTORY, securityNoteCounts, type SecurityNote, type SecurityNoteStatus, type NoteUploadHistoryEntry } from '../../../demo/sap/mockSecurityNotes';
import { Select } from '../../../shared/ui/Select';
import { RefreshIcon, UploadIcon, ClockIcon, SearchIcon, FileTextIcon, CloseIcon, TrashIcon } from '../../../shared/ui/icons';
import { DestinationSwitcher } from '../components/DestinationSwitcher';
import { fireToast } from '../../../shared/lib/toastEvents';
import { PageHeader } from '../../../shared/ui/PageHeader';

const STATUS_TONE: Record<SecurityNoteStatus, string> = {
  'Completely Implemented': 'success',
  'Can Be Implemented': 'info',
  'Cannot Be Implemented': 'danger',
  'Incompletely Implemented': 'warning',
  Obsolete: 'neutral',
  Unknown: 'neutral',
};
const PRIORITY_TONE: Record<SecurityNote['priority'], string> = { 'Hot News': 'danger', 'High Priority': 'warning', Correction: 'info' };
const KPI_ORDER: Array<{ key: SecurityNoteStatus; label: string; help: string }> = [
  { key: 'Completely Implemented', label: 'Completely Implemented', help: 'Fully applied' },
  { key: 'Can Be Implemented', label: 'Can Be Implemented', help: 'Actionable — apply now' },
  { key: 'Cannot Be Implemented', label: 'Cannot Be Implemented', help: 'Not feasible' },
  { key: 'Incompletely Implemented', label: 'Incompletely Implemented', help: 'Partially applied' },
  { key: 'Obsolete', label: 'Obsolete', help: 'No longer applicable' },
  { key: 'Unknown', label: 'Unknown', help: 'Not yet checked' },
];
const CHECK_DESTINATIONS = ['GRC', 'MSQ', 'GRQ', 'EMP'];

function HistoryModal({ entries, onClose }: { entries: NoteUploadHistoryEntry[]; onClose: () => void }) {
  return (
    <div className="mv-dialog-backdrop" onClick={onClose}>
      <section className="mv-dialog mv-dialog--wide" role="dialog" aria-modal="true" aria-label="Upload history" onClick={(e) => e.stopPropagation()}>
        <div className="mv-panel-header">
          <h2 className="mv-panel-title">Upload history</h2>
          <button className="mv-icon-button" aria-label="Close" onClick={onClose}><CloseIcon size={18} /></button>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {entries.map((entry, i) => (
            <div key={i} className="mv-panel" style={{ background: 'var(--mv-surface-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <FileTextIcon size={18} />
                <div><strong>{entry.fileName}</strong><p className="mv-muted" style={{ margin: 0, fontSize: 12 }}>{entry.uploadedAt}</p></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, textAlign: 'center' }}>
                <div><strong style={{ fontSize: 18 }}>{entry.total}</strong><p className="mv-muted" style={{ margin: 0, fontSize: 11 }}>Total</p></div>
                <div><strong style={{ fontSize: 18 }}>{entry.inserted}</strong><p className="mv-muted" style={{ margin: 0, fontSize: 11 }}>Inserted</p></div>
                <div><strong style={{ fontSize: 18 }}>{entry.updated}</strong><p className="mv-muted" style={{ margin: 0, fontSize: 11 }}>Updated</p></div>
                <div><strong style={{ fontSize: 18 }}>{entry.errors}</strong><p className="mv-muted" style={{ margin: 0, fontSize: 11 }}>Errors</p></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: (fileName: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mv-dialog-backdrop" onClick={onClose}>
      <section className="mv-dialog" role="dialog" aria-modal="true" aria-label="Upload security notes" onClick={(e) => e.stopPropagation()}>
        <div className="mv-panel-header">
          <h2 className="mv-panel-title">Upload security notes</h2>
          <button className="mv-icon-button" aria-label="Close" onClick={onClose}><CloseIcon size={18} /></button>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{ width: '100%', padding: 30, border: '2px dashed var(--mv-border)', borderRadius: 10, background: 'transparent', textAlign: 'center', cursor: 'pointer' }}
        >
          <FileTextIcon size={28} style={{ marginBottom: 8, color: 'var(--mv-text-muted)' }} />
          <p style={{ margin: 0, fontWeight: 600 }}>{file ? file.name : 'Drag & drop Excel file here'}</p>
          <p className="mv-muted" style={{ margin: '4px 0 0', fontSize: 12 }}>.xlsx only · max 10 MB</p>
        </button>
        <input ref={inputRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <div className="mv-dialog-actions">
          <button className="mv-secondary-button" onClick={onClose}>Cancel</button>
          <button className="mv-primary-button" disabled={!file} onClick={() => file && onUploaded(file.name)}><UploadIcon size={14} style={{ marginRight: 6 }} />Upload</button>
        </div>
      </section>
    </div>
  );
}

/** SAP's own CVE/patch advisory tracker — replicates MIO's Security Notes
 * (/snote) page: KPI band by implementation status, then a filterable,
 * searchable table of notes, plus the History/Check Status/Upload flows. */
export function SecurityNotesPage() {
  const [notes, setNotes] = useState(MOCK_SECURITY_NOTES);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useRememberedState('sap', 'security-notes-priority', 'All');
  const [status, setStatus] = useRememberedState('sap', 'security-notes-status', 'All');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkedCount, setCheckedCount] = useState(0);
  const [recheckingNote, setRecheckingNote] = useState<string | null>(null);
  const [history, setHistory] = useState(MOCK_NOTE_UPLOAD_HISTORY);

  const counts = securityNoteCounts(notes);
  const filtered = notes.filter((note) => {
    if (priority !== 'All' && note.priority !== priority) return false;
    if (status !== 'All' && note.status !== status) return false;
    if (search && !`${note.noteNumber} ${note.title} ${note.component}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const runCheckStatus = () => {
    setChecking(true);
    setCheckedCount(0);
    const total = notes.length * CHECK_DESTINATIONS.length;
    const step = Math.ceil(total / 12);
    let current = 0;
    const timer = window.setInterval(() => {
      current = Math.min(current + step, total);
      setCheckedCount(current);
      if (current >= total) {
        window.clearInterval(timer);
        setChecking(false);
        fireToast({ type: 'success', message: 'Status check complete across all active destinations.' });
      }
    }, 150);
  };

  const recheckNote = (noteNumber: string) => {
    setRecheckingNote(noteNumber);
    window.setTimeout(() => {
      setRecheckingNote(null);
      fireToast({ type: 'info', message: `Note ${noteNumber} status rechecked from SAP.` });
    }, 900);
  };

  const deleteNote = (noteNumber: string) => setNotes((cur) => cur.filter((n) => n.noteNumber !== noteNumber));

  const handleUploaded = (fileName: string) => {
    setHistory((cur) => [{ fileName, uploadedAt: new Date().toLocaleString(), total: notes.length, inserted: 0, updated: notes.length, errors: 0 }, ...cur]);
    setUploadOpen(false);
    fireToast({ type: 'success', message: `${fileName} uploaded — ${notes.length} notes processed.` });
  };

  return (
    <div>
      <PageHeader title="Security Notes" subtitle={<>SAP Security Notes tracking & management.</>}>
        <DestinationSwitcher />
      </PageHeader>

      <div className="mv-kpi-row-5" style={{ marginBottom: 20 }}>
        <article className="mv-kpi"><span className="mv-kpi-label">Total Notes</span><strong className="mv-kpi-value">{notes.length}</strong><span className="mv-muted">All uploaded notes</span></article>
        {KPI_ORDER.map(({ key, label, help }) => (
          <article className="mv-kpi" key={key}><span className="mv-kpi-label">{label}</span><strong className="mv-kpi-value">{counts[key]}</strong><span className="mv-muted">{help}</span></article>
        ))}
      </div>

      <section className="mv-panel">
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <SearchIcon size={15} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--mv-text-muted)' }} />
            <input className="mv-select" style={{ paddingLeft: 32, width: '100%' }} placeholder="Search by note number, title, component..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select label="Priority" hideLabel value={priority} onChange={setPriority} options={['All', 'Hot News', 'High Priority', 'Correction'].map((v) => ({ value: v, label: v === 'All' ? 'All Priorities' : v }))} style={{ width: 180 }} />
          <Select label="Status" hideLabel value={status} onChange={setStatus} options={['All', ...KPI_ORDER.map((k) => k.key)].map((v) => ({ value: v, label: v === 'All' ? 'All Statuses' : v }))} style={{ width: 220 }} />
          <button className="mv-secondary-button" onClick={() => setHistoryOpen(true)}><ClockIcon size={14} style={{ marginRight: 6 }} />History</button>
          <button className="mv-secondary-button" disabled={checking} onClick={runCheckStatus}><RefreshIcon size={14} style={{ marginRight: 6 }} />{checking ? 'Checking…' : 'Check Status'}</button>
          <button className="mv-primary-button" onClick={() => setUploadOpen(true)}><UploadIcon size={14} style={{ marginRight: 6 }} />Upload</button>
        </div>

        {checking && (
          <div className="mv-panel" style={{ background: 'var(--mv-surface-subtle)', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span>Checking SAP status across active destinations…</span>
              <strong>{checkedCount} / {notes.length * CHECK_DESTINATIONS.length}</strong>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {CHECK_DESTINATIONS.map((d) => <span key={d} className="mv-status mv-status--danger" style={{ fontSize: 11 }}>{d}</span>)}
            </div>
            <div style={{ height: 6, borderRadius: 999, background: 'var(--mv-border)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (checkedCount / (notes.length * CHECK_DESTINATIONS.length)) * 100)}%`, height: '100%', background: 'var(--mv-primary)', transition: 'width 150ms linear' }} />
            </div>
          </div>
        )}

        <div className="mv-table-wrap">
          <table className="mv-table">
            <thead>
              <tr>
                <th>Note Number</th><th>Title</th><th>Priority</th><th>Component</th><th className="mv-num">CVSS</th>
                <th>Released On</th><th>SAP Download</th><th>Status</th><th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((note) => (
                <tr key={note.noteNumber}>
                  <td><strong>{note.noteNumber}</strong></td>
                  <td style={{ maxWidth: 320 }}>{note.title}</td>
                  <td><span className={`mv-status mv-status--${PRIORITY_TONE[note.priority]}`}>{note.priority}</span></td>
                  <td className="mv-muted">{note.component}</td>
                  <td className="mv-num">{note.cvss.toFixed(1)}</td>
                  <td className="mv-muted">{note.releasedOn}</td>
                  <td><span className={`mv-status ${note.downloadStatus === 'Not Downloaded' ? 'mv-status--neutral' : 'mv-status--success'}`}>{note.downloadStatus === 'Success' ? 'SUCCESS' : note.downloadStatus}</span></td>
                  <td><span className={`mv-status mv-status--${STATUS_TONE[note.status]}`}>{note.status}</span></td>
                  <td><div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button
                      className="mv-icon-button"
                      aria-label={`Recheck status for ${note.noteNumber} from SAP`}
                      disabled={recheckingNote === note.noteNumber}
                      onClick={() => recheckNote(note.noteNumber)}
                    >
                      <RefreshIcon size={14} />
                    </button>
                    <button className="mv-icon-button" aria-label={`Delete note ${note.noteNumber}`} onClick={() => deleteNote(note.noteNumber)}>
                      <TrashIcon size={14} />
                    </button>
                  </div></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="mv-muted" style={{ textAlign: 'center', padding: 20 }}>No notes match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {historyOpen && <HistoryModal entries={history} onClose={() => setHistoryOpen(false)} />}
      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} onUploaded={handleUploaded} />}
    </div>
  );
}
