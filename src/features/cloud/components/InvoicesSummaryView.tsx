import { Link } from 'react-router-dom';
import type { InvoiceSummary, ProviderKey } from '../../dashboard';
import { BarList } from '../../../shared/ui/BarList';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { FileTextIcon } from '../../../shared/ui/icons';

const PROVIDER_LABEL: Record<ProviderKey, string> = { azure: 'Azure', aws: 'AWS', btp: 'SAP BTP', gcp: 'Google Cloud' };

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

interface InvoicesSummaryViewProps {
  summary: InvoiceSummary;
  loading: boolean;
  error: string | null;
}

/**
 * The "Invoices" side of the Cost Overview toggle: how many invoices have been uploaded, what they
 * add up to, which providers they came from, and the newest few. Uploading and reviewing individual
 * invoices stays on the Invoices page.
 */
export function InvoicesSummaryView({ summary, loading, error }: InvoicesSummaryViewProps) {
  if (loading) return <div className="mv-loading" aria-label="Loading invoices summary" />;
  if (error) return <div className="mv-inline-error" role="alert">{error}</div>;

  if (summary.count === 0) {
    return (
      <section aria-label="Invoices summary">
        <EmptyState icon={<FileTextIcon size={28} />} heading="No invoices uploaded yet" explanation="Upload provider invoices (PDF or CSV) and Mavera adds them to your spend picture." />
        <p style={{ textAlign: 'center', marginTop: '-0.5rem' }}><Link className="mv-primary-button" to="/invoices">Upload invoices</Link></p>
      </section>
    );
  }

  const newest = summary.latest[0];
  return (
    <section aria-label="Invoices summary" className="mv-invoices-view">
      <div className="mv-kpi-row-4">
        <article className="mv-kpi"><span className="mv-kpi-label">Invoices</span><strong className="mv-kpi-value">{summary.count}</strong><span className="mv-muted">uploaded</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Total invoiced</span><strong className="mv-kpi-value">{formatCurrency(summary.total)}</strong><span className="mv-muted">across {summary.providers.length} provider{summary.providers.length === 1 ? '' : 's'}</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Latest invoice</span><strong className="mv-kpi-value">{newest ? formatCurrency(Number(newest.total_cost ?? 0)) : '—'}</strong><span className="mv-muted">{newest ? `${PROVIDER_LABEL[newest.provider as ProviderKey] ?? newest.provider} · ${formatDate(newest.invoice_date ?? newest.created_at)}` : ''}</span></article>
      </div>

      <div className="mv-pair">
        <section className="mv-panel" aria-labelledby="invoice-split-title">
          <div className="mv-panel-header"><h2 id="invoice-split-title" className="mv-panel-title">Split by provider</h2></div>
          <BarList
            label="Invoiced amount by provider"
            items={summary.providers.map((p) => ({
              key: p.provider,
              label: PROVIDER_LABEL[p.provider] ?? p.provider,
              value: p.total,
              display: formatCurrency(p.total),
              meta: `${p.count} invoice${p.count === 1 ? '' : 's'} · ${p.sharePct}% of total`,
            }))}
          />
        </section>

        <section className="mv-panel" aria-labelledby="invoice-latest-title">
          <div className="mv-panel-header"><h2 id="invoice-latest-title" className="mv-panel-title">Latest invoices</h2></div>
          <div className="mv-table-wrap">
            <table className="mv-table">
              <caption className="mv-sr-only">Most recent uploaded invoices</caption>
              <thead><tr><th>Invoice</th><th>Provider</th><th>Date</th><th className="mv-num">Amount</th></tr></thead>
              <tbody>
                {summary.latest.map((invoice, index) => (
                  <tr key={invoice.id ?? index}>
                    <td>{invoice.invoice_number ?? `Invoice ${invoice.id ?? index + 1}`}</td>
                    <td>{PROVIDER_LABEL[invoice.provider as ProviderKey] ?? invoice.provider ?? '—'}</td>
                    <td>{formatDate(invoice.invoice_date ?? invoice.created_at)}</td>
                    <td className="mv-num">{formatCurrency(Number(invoice.total_cost ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <p><Link className="mv-secondary-button" to="/invoices">Upload more invoices</Link></p>
    </section>
  );
}
