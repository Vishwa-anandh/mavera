import { useId, useState } from 'react';
import { CloseIcon, UploadIcon } from '../../../shared/ui/icons';
import { useModalOverlay } from '../../../shared/ui/useOverlay';
import { parseNoteNumbers } from '../model/securityNotes';
import { plural } from '../model/sapFormat';

interface UploadNotesDialogProps {
  trackedNumbers: string[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (numbers: string[]) => void;
}

/** Add SAP note numbers to track: one or many, separated by commas, spaces or line breaks. */
export function UploadNotesDialog({ trackedNumbers, busy, onClose, onSubmit }: UploadNotesDialogProps) {
  const titleId = useId();
  const helpId = useId();
  const errorId = useId();
  const panelRef = useModalOverlay<HTMLElement>(onClose);
  const [text, setText] = useState('');
  const parsed = parseNoteNumbers(text, trackedNumbers);
  const usable = parsed.fresh.length + parsed.tracked.length;
  const invalidShown = parsed.invalid.slice(0, 4).join(', ') + (parsed.invalid.length > 4 ? `, and ${parsed.invalid.length - 4} more` : '');

  const summary = [
    parsed.fresh.length > 0 && `${plural(parsed.fresh.length, 'new note')} to add`,
    parsed.tracked.length > 0 && `${parsed.tracked.length} already tracked`,
    parsed.repeated > 0 && `${parsed.repeated} repeated`,
  ].filter(Boolean).join(' · ');

  return (
    <div className="mv-dialog-backdrop" onClick={onClose}>
      <section ref={panelRef} className="mv-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <div className="mv-panel-header">
          <h2 className="mv-panel-title" id={titleId}>Upload security notes</h2>
          <button type="button" className="mv-icon-button" aria-label="Close" onClick={onClose}><CloseIcon size={18} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (usable > 0 && parsed.invalid.length === 0 && !busy) onSubmit([...parsed.fresh, ...parsed.tracked]); }}>
          <label className="mv-field">
            Note numbers
            <textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'3727078\n3515598, 3763800'}
              aria-describedby={`${helpId} ${parsed.invalid.length > 0 ? errorId : ''}`}
              aria-invalid={parsed.invalid.length > 0}
              data-autofocus
            />
          </label>
          <p className="mv-field-help" id={helpId}>One or many, separated by commas, spaces or new lines. A note number is exactly 7 digits.</p>
          {parsed.invalid.length > 0 && <p className="mv-field-error" id={errorId} role="alert">Not a note number: {invalidShown}. Fix or remove {parsed.invalid.length === 1 ? 'it' : 'them'} to continue.</p>}
          <p className="mv-muted mv-upload-summary" aria-live="polite">{summary || 'Nothing to upload yet.'}</p>
          <div className="mv-notice">Sample data: SAP is not contacted. New notes are added as Unknown with the SAP download pending until you run Check Status.</div>
          <div className="mv-dialog-actions">
            <button type="button" className="mv-secondary-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="mv-primary-button" disabled={usable === 0 || parsed.invalid.length > 0 || busy}>
              <UploadIcon size={14} style={{ marginRight: '0.375rem' }} />{busy ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
