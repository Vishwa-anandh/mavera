import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { InvoiceParserForm } from '../../../shared/ui/InvoiceParserForm';
import { ParsedInvoiceResult } from '../../../shared/ui/ParsedInvoiceResult';
import { PARSE_DELAY_MS, invoiceFileProblem, simulateInvoiceParse, type DemoProvider, type ParsedInvoice } from '../../../shared/lib/parseInvoice';
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
  const [stage, setStage] = useState<Stage>('choose');
  const [result, setResult] = useState<ParsedInvoice | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const providerLegendRef = useRef<HTMLLegendElement>(null);

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

  const choose = (picked: File) => {
    const reason = invoiceFileProblem(picked);
    setProblem(reason);
    setFile(reason ? null : picked);
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
          <ParsedInvoiceResult ref={headingRef} invoice={result} onReset={reset}>
            <aside className="mv-idemo-cta" aria-label="Next steps">
              <div>
                <h3 className="mv-panel-title">Track every invoice, not just this one</h3>
                <p className="mv-muted">Register your company to keep parsed invoices next to your live cloud costs, budgets and alerts.</p>
              </div>
              <div className="mv-idemo-cta-actions">
                <Link className="mv-primary-button" to="/company-signup">Register your company</Link>
                <Link className="mv-secondary-button" to="/login">Sign in</Link>
              </div>
            </aside>
          </ParsedInvoiceResult>
        ) : (
          <InvoiceParserForm
            provider={provider} onProviderChange={setProvider} file={file} problem={problem} onFile={choose}
            parsing={parsing} onSubmit={() => setStage('parsing')} legendRef={providerLegendRef}
          />
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
