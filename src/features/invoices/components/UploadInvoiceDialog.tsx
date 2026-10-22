import { useEffect, useRef, useState } from 'react';
import { useModalOverlay } from '../../../shared/ui/useOverlay';
import { InvoiceParserForm } from '../../../shared/ui/InvoiceParserForm';
import { ParsedInvoiceResult } from '../../../shared/ui/ParsedInvoiceResult';
import { CloseIcon } from '../../../shared/ui/icons';
import { PARSE_DELAY_MS, invoiceFileProblem, simulateInvoiceParse, type ParsedInvoice } from '../../../shared/lib/parseInvoice';
import type { CloudProvider } from '../../../shared/types/auth';
import { PROVIDER_LABELS, buildFakeParsedInvoice, detectInvoiceUpload } from '../model/invoicesDerivations';
import type { Invoice } from '../model/invoicesTypes';

/** What the page already knows when it opens the dialog: a file it was handed and the provider it guessed for it. */
export interface UploadStart {
  fileName: string;
  sizeBytes: number;
  provider: CloudProvider;
  /** The file name settled the provider, so parsing starts at once instead of waiting for a click. */
  confident: boolean;
}

type Stage = 'choose' | 'parsing' | 'done';
interface Chosen { name: string; size: number }

const guessText = (provider: CloudProvider, confident: boolean) => (confident
  ? `Provider detected from the file name: ${PROVIDER_LABELS[provider]}.`
  : `We could not tell the provider from the file name, so we chose ${PROVIDER_LABELS[provider]}. Change it if that is wrong.`);

const extensionOf = (provider: CloudProvider) => (provider === 'btp' ? '.xlsx' : '.pdf');

/**
 * The Upload Invoice dialog: the same parser UI as the public /invoice-demo page (provider chips, drop zone, Parse
 * button, result breakdown), shared from shared/ui. The Invoices page adds its own rules on top: only the providers the
 * member may upload for, SAP BTP invoices as .xlsx and the others as .pdf, and a file whose name settles the provider
 * parses at once. The invoice is saved (`onCreated`) the moment the parse finishes, with the figures the result shows;
 * closing the dialog before then saves nothing.
 */
export function UploadInvoiceDialog({ allowedProviders, start, onClose, onCreated }: { allowedProviders: CloudProvider[]; start: UploadStart | null; onClose: () => void; onCreated: (invoice: Invoice) => void }) {
  const panelRef = useModalOverlay<HTMLElement>(onClose);
  const [provider, setProvider] = useState<CloudProvider>(start?.provider ?? allowedProviders[0] ?? 'azure');
  const [file, setFile] = useState<Chosen | null>(start ? { name: start.fileName, size: start.sizeBytes } : null);
  const [problem, setProblem] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(start ? guessText(start.provider, start.confident) : null);
  const [billingName, setBillingName] = useState('');
  const [stage, setStage] = useState<Stage>(start?.confident ? 'parsing' : 'choose');
  const [result, setResult] = useState<ParsedInvoice | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const legendRef = useRef<HTMLLegendElement>(null);
  const onCreatedRef = useRef(onCreated);
  useEffect(() => { onCreatedRef.current = onCreated; });

  // The parse. Closing the dialog mid-parse (or React re-running this effect) cancels the pending timer, so an upload
  // nobody is looking at never adds an invoice, and the re-run starts the wait again.
  useEffect(() => {
    if (stage !== 'parsing' || !file) return undefined;
    const timer = window.setTimeout(() => {
      const parsed = simulateInvoiceParse({ provider, fileName: file.name, sizeBytes: file.size });
      setResult(parsed);
      setStage('done');
      onCreatedRef.current(buildFakeParsedInvoice(provider, file.name, billingName.trim() || undefined, new Date(), parsed));
    }, PARSE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [stage, file, provider, billingName]);

  useEffect(() => {
    if (stage === 'done') headingRef.current?.focus();
  }, [stage]);

  /** A file arrived from the drop zone: validate it, pick its provider, and parse at once when the name settles it. */
  const receive = (picked: File) => {
    const found = detectInvoiceUpload(picked.name, allowedProviders);
    if (found.problem || !found.provider) { setProblem(found.problem ?? 'This file cannot be uploaded.'); setFile(null); setHint(null); return; }
    const reason = invoiceFileProblem(picked);
    if (reason) { setProblem(reason); setFile(null); setHint(null); return; }
    setProblem(null);
    setFile({ name: picked.name, size: picked.size });
    setProvider(found.provider);
    setHint(guessText(found.provider, found.confident));
    if (found.confident) setStage('parsing');
  };

  const changeProvider = (next: CloudProvider) => {
    setProvider(next);
    setHint(null);
    if (file && !file.name.toLowerCase().endsWith(extensionOf(next))) {
      setProblem(`${PROVIDER_LABELS[next]} invoices must be a ${extensionOf(next)} file. Choose the file again.`);
      setFile(null);
    } else {
      setProblem(null);
    }
  };

  const another = () => {
    setStage('choose');
    setResult(null);
    setFile(null);
    setProblem(null);
    setHint(null);
    setBillingName('');
    window.setTimeout(() => legendRef.current?.focus(), 0);
  };

  const header = (
    <div className="mv-panel-header"><h2 className="mv-panel-title">Upload Invoice</h2><button type="button" className="mv-icon-button" aria-label="Close" onClick={onClose}><CloseIcon size={16} /></button></div>
  );

  return (
    <div className="mv-dialog-backdrop mv-dialog-backdrop--tall" onClick={onClose}>
      <section ref={panelRef} className="mv-dialog mv-dialog--parser" role="dialog" aria-modal="true" aria-label="Upload invoice" onClick={(e) => e.stopPropagation()}>
        {header}
        {allowedProviders.length === 0 ? (
          <div className="mv-inline-error" role="alert">No cloud access — contact your administrator.</div>
        ) : stage === 'done' && result ? (
          <>
            <p className="mv-subtitle mv-parser-saved" role="status">{result.fileName} parsed and saved to your invoices.</p>
            <ParsedInvoiceResult ref={headingRef} invoice={result} onReset={another} resetLabel="Upload another invoice" compact />
            <div className="mv-dialog-actions"><button type="button" className="mv-primary-button" onClick={onClose}>Done</button></div>
          </>
        ) : (
          <>
            <p className="mv-subtitle mv-parser-lede">Choose the provider, add the PDF or XLSX, and see the services, tax and total.</p>
            <InvoiceParserForm
              variant="flush"
              providers={allowedProviders}
              provider={provider}
              onProviderChange={changeProvider}
              file={file}
              problem={problem}
              hint={hint}
              onFile={receive}
              parsing={stage === 'parsing'}
              onSubmit={() => setStage('parsing')}
              onCancel={onClose}
              submitLabel="Parse invoice"
              legendRef={legendRef}
            >
              <label className="mv-field mv-parser-billing">
                Billing name <span className="mv-field-help">(optional, used when not found in the file)</span>
                <input maxLength={120} value={billingName} disabled={stage === 'parsing'} onChange={(e) => setBillingName(e.target.value)} placeholder="e.g. Production Subscription" />
              </label>
            </InvoiceParserForm>
          </>
        )}
      </section>
    </div>
  );
}
