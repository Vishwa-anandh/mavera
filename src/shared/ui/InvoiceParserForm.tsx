import { useId, useState, type ChangeEvent, type DragEvent, type FormEvent, type ReactNode, type Ref } from 'react';
import { ACCEPTED_EXTENSIONS, DEMO_PROVIDERS, MAX_INVOICE_BYTES, formatFileSize, type DemoProvider } from '../lib/parseInvoice';
import { FileTextIcon, UploadIcon } from './icons';

/** What the prototype parser does and does not do; both places that show the form say it the same way. */
export const PARSER_PROTOTYPE_NOTE = 'Prototype: your file stays in your browser and is never read or uploaded. The breakdown shown is a generated sample based on the file name and size, not on what is inside the invoice.';

interface InvoiceParserFormProps {
  /** The providers that can be chosen, in order; defaults to all four. */
  providers?: DemoProvider[];
  provider: DemoProvider;
  onProviderChange: (provider: DemoProvider) => void;
  /** The chosen file, if any. Only its name and size are shown. */
  file: { name: string; size: number } | null;
  /** Why the last file cannot be used. */
  problem: string | null;
  /** A neutral line under the drop zone, such as which provider was detected from the file name. */
  hint?: string | null;
  /** A file arrived from the chooser or a drop. The form never reads it. */
  onFile: (file: File) => void;
  parsing: boolean;
  /** The user asked to parse the chosen file. */
  onSubmit: () => void;
  submitLabel?: string;
  /** Extra fields shown between the drop zone and the buttons, such as a billing name. */
  children?: ReactNode;
  /** Adds a Cancel button before the submit button. */
  onCancel?: () => void;
  /** The prototype notice at the bottom; null hides it. */
  notice?: ReactNode;
  /** The "Cloud provider" legend, so a host can move focus back to the form. */
  legendRef?: Ref<HTMLLegendElement>;
  /** `flush` drops the card border and padding for a host that already has its own surface, such as a dialog. */
  variant?: 'card' | 'flush';
}

/**
 * The invoice parser's input side: the cloud provider chips with a hint for the chosen provider, the dashed drop zone
 * and the Parse button. Shared by the public /invoice-demo page and the Invoices upload dialog. It owns only the
 * drag highlight; the file, provider and parse stage belong to the host.
 */
export function InvoiceParserForm({
  providers, provider, onProviderChange, file, problem, hint, onFile, parsing, onSubmit, submitLabel = 'Parse invoice', children, onCancel,
  notice = PARSER_PROTOTYPE_NOTE, legendRef, variant = 'card',
}: InvoiceParserFormProps) {
  const [dragging, setDragging] = useState(false);
  const providerName = useId();
  const dropHelpId = useId();
  const problemId = useId();
  const options = providers ? DEMO_PROVIDERS.filter((option) => providers.includes(option.id)) : DEMO_PROVIDERS;
  const usable = Boolean(file) && !problem;

  const onInput = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    event.target.value = '';
    if (picked) onFile(picked);
  };
  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) onFile(dropped);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (usable && !parsing) onSubmit();
  };

  return (
    <form className={`mv-idemo-card${variant === 'flush' ? ' mv-idemo-card--flush' : ''}`} aria-busy={parsing} onSubmit={submit}>
      <fieldset className="mv-idemo-providers" disabled={parsing}>
        <legend ref={legendRef} tabIndex={-1}>Cloud provider</legend>
        <div className="mv-idemo-provider-list">
          {options.map((option) => (
            <label key={option.id} className="mv-idemo-provider">
              <input type="radio" name={providerName} value={option.id} checked={provider === option.id} onChange={() => onProviderChange(option.id)} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <p className="mv-field-help">{DEMO_PROVIDERS.find((p) => p.id === provider)?.hint}</p>
      </fieldset>

      <label
        className={`mv-idemo-drop${dragging ? ' is-dragging' : ''}${file ? ' has-file' : ''}${problem ? ' has-problem' : ''}`}
        onDragOver={(event) => { event.preventDefault(); if (!parsing) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={parsing ? (event) => event.preventDefault() : onDrop}
      >
        <input
          type="file" className="mv-sr-only" accept={`${ACCEPTED_EXTENSIONS.join(',')},application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`}
          aria-label="Invoice file (PDF or XLSX)" aria-describedby={`${dropHelpId}${problem ? ` ${problemId}` : ''}`} aria-invalid={problem ? true : undefined}
          disabled={parsing} onChange={onInput}
        />
        {file ? (
          <span className="mv-idemo-drop-file">
            <FileTextIcon size={22} aria-hidden="true" />
            <span><strong>{file.name}</strong><span className="mv-muted"> · {formatFileSize(file.size)}</span></span>
          </span>
        ) : (
          <span className="mv-idemo-drop-prompt">
            <UploadIcon size={22} aria-hidden="true" />
            <span><strong>Drop your invoice here</strong> or <span className="mv-idemo-browse">browse</span></span>
          </span>
        )}
        <span className="mv-field-help" id={dropHelpId}>
          {file ? 'Choose a different file to replace it.' : `PDF or XLSX, up to ${MAX_INVOICE_BYTES / (1024 * 1024)} MB.`}
        </span>
      </label>
      {problem && <p className="mv-field-error" id={problemId} role="alert">{problem}</p>}
      {hint && !problem && <p className="mv-field-help mv-idemo-hint">{hint}</p>}

      {children}

      <div className="mv-idemo-submit">
        {onCancel && <button type="button" className="mv-secondary-button" onClick={onCancel} disabled={parsing}>Cancel</button>}
        <button type="submit" className="mv-primary-button" disabled={!usable || parsing}>{parsing ? 'Parsing…' : submitLabel}</button>
        <p className="mv-muted" role="status" aria-live="polite">{parsing ? `Parsing ${file?.name ?? 'the invoice'}. Reading the invoice…` : ''}</p>
      </div>
      {notice ? <p className="mv-notice mv-idemo-note">{notice}</p> : null}
    </form>
  );
}
