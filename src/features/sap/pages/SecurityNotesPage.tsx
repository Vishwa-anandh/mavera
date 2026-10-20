import { useState } from 'react';
import { oneOf, useRememberedState } from '../../../shared/lib/useRememberedState';
import { fireToast } from '../../../shared/lib/toastEvents';
import { useConfirm } from '../../../shared/ui/ConfirmProvider';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Pagination } from '../../../shared/ui/Pagination';
import { Select } from '../../../shared/ui/Select';
import { StatusTag } from '../../../shared/ui/StatusTag';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { usePagination } from '../../../shared/ui/usePagination';
import { ClockIcon, RefreshIcon, SearchIcon, TrashIcon, UploadIcon } from '../../../shared/ui/icons';
import { DestinationSwitcher } from '../components/DestinationSwitcher';
import { NotesHistoryDrawer } from '../components/NotesHistoryDrawer';
import { UploadNotesDialog } from '../components/UploadNotesDialog';
import { formatNoteRelease, plural } from '../model/sapFormat';
import {
  DOWNLOAD_TONE, NOTE_DOWNLOAD_STATUSES, NOTE_PRIORITIES, NOTE_STATUSES, PRIORITY_TONE, STATUS_TONE, filterNotes, securityNoteCounts, type NoteFilters,
} from '../model/securityNotes';
import { useSecurityNotes } from '../model/useSecurityNotes';

const KPI_HELP: Record<(typeof NOTE_STATUSES)[number], string> = {
  'Completely Implemented': 'Fully applied',
  'Can Be Implemented': 'Actionable — apply now',
  'Cannot Be Implemented': 'Not feasible',
  'Incompletely Implemented': 'Partially applied',
  Obsolete: 'No longer applicable',
  Unknown: 'Not yet checked',
};

/**
 * SAP's own CVE/patch advisory tracker (MIO /snote): a band of counts by implementation status, then a
 * filterable, searchable, paged table of notes. Upload, Check Status and History sit in the page header;
 * every row can be rechecked against SAP or deleted. SAP itself is simulated in the data-access store.
 */
export function SecurityNotesPage() {
  const confirm = useConfirm();
  const { notes, history, busy, upload, checkStatus, recheck, remove } = useSecurityNotes();
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useRememberedState<NoteFilters['priority']>('sap', 'security-notes-priority', 'All', oneOf(['All', ...NOTE_PRIORITIES]));
  const [status, setStatus] = useRememberedState<NoteFilters['status']>('sap', 'security-notes-status', 'All', oneOf(['All', ...NOTE_STATUSES]));
  const [download, setDownload] = useRememberedState<NoteFilters['download']>('sap', 'security-notes-download', 'All', oneOf(['All', ...NOTE_DOWNLOAD_STATUSES]));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const counts = securityNoteCounts(notes);
  const filtered = filterNotes(notes, { search, priority, status, download });
  const filtersActive = Boolean(search.trim()) || priority !== 'All' || status !== 'All' || download !== 'All';
  const paging = usePagination(filtered, 10, `${search}|${priority}|${status}|${download}`);
  const clearFilters = () => { setSearch(''); setPriority('All'); setStatus('All'); setDownload('All'); };
  const working = busy !== null;

  const onUpload = async (numbers: string[]) => {
    const { added, updated } = await upload(numbers);
    setUploadOpen(false);
    fireToast({
      type: 'success',
      message: added.length > 0
        ? `${plural(added.length, 'note')} added as Unknown${updated.length ? `, ${updated.length} already tracked` : ''}. Run Check Status to resolve them.`
        : `${plural(updated.length, 'note')} already tracked; nothing new to add.`,
    });
  };

  const onCheck = async () => {
    const result = await checkStatus();
    if (result.checked === 0) {
      fireToast({ type: 'info', message: 'No notes are waiting for a status. Everything has already been checked.' });
    } else {
      fireToast({
        type: result.failed > 0 ? 'warning' : 'success',
        message: `Checked ${plural(result.checked, 'note')}: ${result.resolved} resolved${result.failed > 0 ? `, ${result.failed} could not be downloaded from SAP` : ''}.`,
      });
    }
  };

  const onRecheck = async (noteNumber: string) => {
    const note = await recheck(noteNumber);
    if (note) fireToast({ type: note.status === 'Unknown' ? 'warning' : 'info', message: `Note ${noteNumber} rechecked from SAP: ${note.status}.` });
  };

  const onDelete = async (noteNumber: string) => {
    const ok = await confirm({
      title: `Delete note ${noteNumber}?`,
      description: 'The note stops being tracked in Mavera and the counts update. SAP itself is not changed.',
      variant: 'delete',
      okText: 'Delete note',
    });
    if (!ok) return;
    if (await remove(noteNumber)) fireToast({ type: 'success', message: `Note ${noteNumber} deleted.` });
  };

  return (
    <div>
      <PageHeader title="Security Notes" subtitle="SAP Security Notes tracking & management.">
        <div className="mv-actions-wrap">
        <DestinationSwitcher />
        <button type="button" className="mv-secondary-button" onClick={() => setHistoryOpen(true)}><ClockIcon size={14} style={{ marginRight: '0.375rem' }} />History</button>
        <button type="button" className="mv-secondary-button" disabled={working} onClick={onCheck}>
          <RefreshIcon size={14} style={{ marginRight: '0.375rem' }} />{busy?.kind === 'check' ? 'Checking…' : 'Check Status'}
        </button>
        <button type="button" className="mv-primary-button" disabled={working} onClick={() => setUploadOpen(true)}><UploadIcon size={14} style={{ marginRight: '0.375rem' }} />Upload</button>
        </div>
      </PageHeader>

      <div className="mv-kpi-row-5" style={{ marginBottom: '1.25rem' }}>
        <article className="mv-kpi"><span className="mv-kpi-label">Total Notes</span><strong className="mv-kpi-value">{notes.length}</strong><span className="mv-muted">All uploaded notes</span></article>
        {NOTE_STATUSES.map((key) => (
          <article className="mv-kpi" key={key}><span className="mv-kpi-label">{key}</span><strong className="mv-kpi-value">{counts[key]}</strong><span className="mv-muted">{KPI_HELP[key]}</span></article>
        ))}
      </div>

      <section className="mv-panel" aria-label="Security notes">
        <div className="mv-filter-bar" role="search" aria-label="Filter security notes">
          <label className="mv-filter-search">
            <SearchIcon size={16} aria-hidden />
            <input aria-label="Search by note number, title or component" placeholder="Search by note number, title, component..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <Select label="Priority" hideLabel value={priority} onChange={setPriority} options={[{ value: 'All', label: 'All Priorities' }, ...NOTE_PRIORITIES.map((v) => ({ value: v, label: v }))]} />
          <Select label="Status" hideLabel value={status} onChange={setStatus} options={[{ value: 'All', label: 'All Statuses' }, ...NOTE_STATUSES.map((v) => ({ value: v, label: v }))]} />
          <Select label="SAP download" hideLabel value={download} onChange={setDownload} options={[{ value: 'All', label: 'All Downloads' }, ...NOTE_DOWNLOAD_STATUSES.map((v) => ({ value: v, label: v }))]} />
          {filtersActive && <button type="button" className="mv-quiet-button" onClick={clearFilters}>Clear filters</button>}
        </div>

        <p className="mv-sr-only" role="status" aria-live="polite">{busy?.kind === 'check' ? 'Checking unknown notes against SAP' : busy?.kind === 'upload' ? 'Uploading notes' : ''}</p>
        {busy?.kind === 'check' && <p className="mv-muted mv-working-line" aria-hidden>Checking unknown notes against SAP…</p>}

        {notes.length === 0 ? (
          <div className="mv-empty-inline">
            <p><strong>No security notes are tracked yet.</strong></p>
            <p>Upload note numbers to start tracking them.</p>
            <button type="button" className="mv-primary-button" onClick={() => setUploadOpen(true)}>Upload notes</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mv-empty-inline"><p><strong>No notes match this filter.</strong></p><button type="button" className="mv-quiet-button" onClick={clearFilters}>Clear filters</button></div>
        ) : (
          <>
            <div className="mv-table-wrap">
              <table className="mv-table mv-table--stack mv-sap-table">
                <caption className="mv-sr-only">SAP security notes</caption>
                <thead>
                  <tr>
                    <th>Note Number</th><th>Title</th><th>Priority</th><th className="mv-hide-phone">Component</th><th className="mv-num">CVSS</th>
                    <th className="mv-hide-phone">Released On</th><th>SAP Download</th><th>Status</th><th><span className="mv-sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {paging.pageItems.map((note) => {
                    const rowBusy = busy !== null && 'noteNumber' in busy && busy.noteNumber === note.noteNumber;
                    return (
                      <tr key={note.noteNumber}>
                        <td data-label="Note Number" className="mv-stack-title"><strong>{note.noteNumber}</strong></td>
                        <td data-label="Title" className="mv-note-title">{note.title}</td>
                        <td data-label="Priority">{note.priority ? <StatusTag tone={PRIORITY_TONE[note.priority]}>{note.priority}</StatusTag> : <span className="mv-muted">—</span>}</td>
                        <td data-label="Component" className="mv-muted mv-hide-phone">{note.component ?? '—'}</td>
                        <td data-label="CVSS" className="mv-num">{note.cvss === null ? <span className="mv-muted">—</span> : note.cvss.toFixed(1)}</td>
                        <td data-label="Released On" className="mv-muted mv-hide-phone">{note.releasedOn ? formatNoteRelease(note.releasedOn) : '—'}</td>
                        <td data-label="SAP Download"><StatusTag tone={DOWNLOAD_TONE[note.downloadStatus]}>{note.downloadStatus}</StatusTag></td>
                        <td data-label="Status"><StatusTag tone={STATUS_TONE[note.status]}>{note.status}</StatusTag></td>
                        <td className="mv-stack-actions">
                          <div className="mv-row-actions">
                            <Tooltip content="Recheck status from SAP">
                              <button type="button" className="mv-icon-button" aria-label={`Recheck status from SAP for note ${note.noteNumber}`} disabled={working} aria-busy={rowBusy && busy?.kind === 'recheck'} onClick={() => onRecheck(note.noteNumber)}>
                                <RefreshIcon size={14} />
                              </button>
                            </Tooltip>
                            <Tooltip content="Delete note">
                              <button type="button" className="mv-icon-button" aria-label={`Delete note ${note.noteNumber}`} disabled={working} onClick={() => onDelete(note.noteNumber)}>
                                <TrashIcon size={14} />
                              </button>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={paging.page} pageSize={paging.pageSize} total={paging.total} onPageChange={paging.onPageChange} onPageSizeChange={paging.onPageSizeChange} noun="notes" />
          </>
        )}
      </section>

      {historyOpen && <NotesHistoryDrawer entries={history} onClose={() => setHistoryOpen(false)} />}
      {uploadOpen && <UploadNotesDialog trackedNumbers={notes.map((n) => n.noteNumber)} busy={busy?.kind === 'upload'} onClose={() => setUploadOpen(false)} onSubmit={onUpload} />}
    </div>
  );
}
