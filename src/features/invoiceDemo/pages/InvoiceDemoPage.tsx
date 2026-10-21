import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { ParsedInvoiceResult } from '../components/ParsedInvoiceResult';
import {
  ACCEPTED_EXTENSIONS, DEMO_PROVIDERS, MAX_INVOICE_BYTES, PARSE_DELAY_MS, formatFileSize, invoiceFileProblem, simulateInvoiceParse,
  type DemoProvider, type ParsedInvoice,
} from '../model/parseInvoice';
import { FileTextIcon, UploadIcon } from '../../../shared/ui/icons';
import maveraLogo from '../../../../assets/brand/mavera-logo.png';
import maitsysLogo from '../../../../assets/brand/maitsys.png';

type Stage = 'choose' | 'parsing' | 'done';

/**
 * Public demo at /invoice-demo: pick a provider, choose a PDF or XLSX, and see a sample breakdown. No sign-in is needed
 * and nothing is uploaded: the file is never read, and the figures come from `simulateInvoiceParse`, which is labelled
 * as a sample so nobody mistakes it for a real parse.
 */
export function InvoiceDemoPage() {
  const [provider, setProvider] = useState<DemoProvider>('azure');
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<Stage>('choose');
  const [result, setResult] = useState<ParsedInvoice | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const providerLegendRef = useRef<HTMLLegendElement>(null);
  const providerName = useId();
  const dropHelpId = useId();
  const problemId = useId();

  useEffect(() => {
    if (stage !== 'parsing' || !file) return undefined;
    const timer = window.setTimeout(() => {
      setResult(simulateInvoiceParse({ provider, fileName: file.name, sizeBytes: file.size }));
      setStage('done');
    }, PARSE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [stage, file, provider]);

  useEffect(() => {
    if (stage === 'done') headingRef.current?.focus();
  }, [stage]);

  const choose = (picked: File | undefined) => {
    if (!picked) return;
    const reason = invoiceFileProblem(picked);
    setProblem(reason);
    setFile(reason ? null : picked);
  };
  const onInput = (event: ChangeEvent<HTMLInputElement>) => {
    choose(event.target.files?.[0]);
    event.target.value = '';
  };
  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    choose(event.dataTransfer.files?.[0]);
  };
  const reset = () => {
    setStage('choose');
    setResult(null);
    setFile(null);
    setProblem(null);
    window.setTimeout(() => providerLegendRef.current?.focus(), 0);
  };

  const parsing = stage === 'parsing';

  return (
    <div className="mv-idemo">
      <header className="mv-idemo-top">
        <Link to="/login" aria-label="Mavera, go to sign in"><img className="mv-idemo-logo" src={maveraLogo} alt="Mavera" width={160} /></Link>
        <nav aria-label="Account" className="mv-idemo-nav">
          <Link className="mv-quiet-button" to="/company-signup">Register your company</Link>
          <Link className="mv-secondary-button" to="/login">Sign in</Link>
        </nav>
      </header>

      <main className="mv-idemo-main">
        <div className="mv-idemo-hero">
          <p className="mv-eyebrow">Invoice parser</p>
          <h1 className="mv-idemo-title">Parse your cloud invoice in seconds</h1>
          <p className="mv-idemo-lede">Choose your provider, add the invoice, and see the services, tax and total laid out. No account needed.</p>
        </div>

        {stage === 'done' && result ? (
          <ParsedInvoiceResult ref={headingRef} invoice={result} onReset={reset} />
        ) : (
          <form
            className="mv-idemo-card"
            aria-busy={parsing}
            onSubmit={(event) => { event.preventDefault(); if (file && !parsing) setStage('parsing'); }}
          >
            <fieldset className="mv-idemo-providers" disabled={parsing}>
              <legend ref={providerLegendRef} tabIndex={-1}>Cloud provider</legend>
              <div className="mv-idemo-provider-list">
                {DEMO_PROVIDERS.map((option) => (
                  <label key={option.id} className="mv-idemo-provider">
                    <input type="radio" name={providerName} value={option.id} checked={provider === option.id} onChange={() => setProvider(option.id)} />
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
                ref={inputRef} type="file" className="mv-sr-only" accept={`${ACCEPTED_EXTENSIONS.join(',')},application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`}
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

            <div className="mv-idemo-submit">
              <button type="submit" className="mv-primary-button" disabled={!file || parsing}>{parsing ? 'Parsing…' : 'Parse invoice'}</button>
              <p className="mv-muted" role="status" aria-live="polite">{parsing ? 'Reading the invoice…' : ''}</p>
            </div>
            <p className="mv-notice mv-idemo-note">Prototype: your file stays in your browser and is never read or uploaded. The breakdown shown is a generated sample based on the file name and size, not on what is inside the invoice.</p>
          </form>
        )}
      </main>

      <footer className="mv-idemo-footer">
        <span className="mv-login-footer-brand">Powered by <img src={maitsysLogo} alt="Maitsys" className="mv-maitsys-logo" /></span>
        <Link to="/login">Sign in</Link>
        <a href="https://www.maitsys.com/contact-us" target="_blank" rel="noreferrer">Support</a>
      </footer>
    </div>
  );
}
