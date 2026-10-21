import { Link } from 'react-router-dom';
import type { InvoiceItem, InvoiceSummary, ProviderKey } from '../../dashboard';
import { BarLineChart } from '../../../shared/ui/BarLineChart';
import { BarList } from '../../../shared/ui/BarList';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ChevronRightIcon, FileTextIcon, PercentIcon, UploadIcon } from '../../../shared/ui/icons';
import { invoiceSavingsOf } from '../model/invoiceSavings';

const PROVIDER_LABEL: Record<ProviderKey, string> = { azure: 'Azure', aws: 'AWS', btp: 'SAP BTP', gcp: 'Google Cloud' };
/** The same provider colours the Cost Overview uses for its provider breakdown. */
const PROVIDER_COLOR: Record<ProviderKey, string> = { azure: '#0078D4', aws: '#EC7211', btp: '#059669', gcp: '#4285F4' };

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

const formatRate = (fraction: number) => `${(fraction * 100).toFixed(1)}%`;

function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

interface InvoicesSummaryViewProps {
  summary: InvoiceSummary;
  /** Every invoice, for the monthly savings chart; `summary.latest` is only the newest few. */
  invoices: InvoiceItem[];
  loading: boolean;
  error: string | null;
}

/**
 * The "Invoices" side of the Cost Overview toggle: how many invoices have been uploaded, what they add up to and
 * the Maitsys CSP saving on them (monthly invoice totals as stacked bars with the saving as a line), which
 * providers they came from, and the recent few with a link to all of them. Uploading and reviewing individual
 * invoices stays on the Invoices page.
 */
export function InvoicesSummaryView({ summary, invoices, loading, error }: InvoicesSummaryViewProps) {
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
  const savings = invoiceSavingsOf(invoices);
  const chartProviders = (Object.keys(PROVIDER_LABEL) as ProviderKey[]).filter((p) => savings.months.some((m) => m[p] > 0));
  return (
    <section aria-label="Invoices summary" className="mv-invoices-view">
      <div className="mv-kpi-row-4">
        <article className="mv-kpi"><span className="mv-kpi-label">Invoices</span><strong className="mv-kpi-value">{summary.count}</strong><span className="mv-muted">uploaded</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Total invoiced</span><strong className="mv-kpi-value">{formatCurrency(summary.total)}</strong><span className="mv-muted">across {summary.providers.length} provider{summary.providers.length === 1 ? '' : 's'}</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Latest invoice</span><strong className="mv-kpi-value">{newest ? formatCurrency(Number(newest.total_cost ?? 0)) : '—'}</strong><span className="mv-muted">{newest ? `${PROVIDER_LABEL[newest.provider as ProviderKey] ?? newest.provider} · ${formatDate(newest.invoice_date ?? newest.created_at)}` : ''}</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">CSP savings</span><strong className="mv-kpi-value mv-csp-saving">{formatCurrency(savings.savings)}</strong><span className="mv-muted">estimated, {formatRate(savings.avgRate)} average rate</span></article>
      </div>

      <section className="mv-panel mv-csp-overview" aria-labelledby="invoice-csp-title">
        <div className="mv-panel-header">
          <div>
            <h2 id="invoice-csp-title" className="mv-panel-title"><PercentIcon size={16} aria-hidden style={{ marginRight: '0.5rem', verticalAlign: -2 }} />Maitsys CSP Savings vs Invoice Total</h2>
            <p className="mv-muted" style={{ margin: '2px 0 0' }}>Bars show what was invoiced each month, the dashed line the estimated CSP saving on it (right-hand scale).</p>
          </div>
        </div>
        <dl className="mv-csp-figures">
          <div><dt>Total invoiced</dt><dd>{formatCurrency(savings.invoiced)}</dd></div>
          <div><dt>CSP savings</dt><dd className="mv-csp-saving">{formatCurrency(savings.savings)}</dd></div>
          <div><dt>Average rate</dt><dd>{formatRate(savings.avgRate)}</dd></div>
          {savings.byProvider.map((p) => (
            <div key={p.provider}><dt>{PROVIDER_LABEL[p.provider]} at {formatRate(p.rate)}</dt><dd className="mv-csp-saving">{formatCurrency(p.savings)}<span className="mv-muted"> from {formatCurrency(p.base)}</span></dd></div>
          ))}
        </dl>
        <BarLineChart
          title="Maitsys CSP Savings vs Invoice Total"
          data={savings.months.map((m) => ({ name: m.name, azure: m.azure, aws: m.aws, btp: m.btp, gcp: m.gcp, savings: m.savings }))}
          bars={chartProviders.map((p) => ({ key: p, label: PROVIDER_LABEL[p], color: PROVIDER_COLOR[p] }))}
          line={{ key: 'savings', label: 'CSP savings (estimated)' }}
          format={formatCurrency}
          axisFormat={(v) => `$${Math.round(v).toLocaleString('en-US')}`}
        />
      </section>

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
          <div className="mv-panel-header">
            <h2 id="invoice-latest-title" className="mv-panel-title">Recent invoices</h2>
            <Link className="mv-quiet-button" to="/invoices" aria-label="View all invoices">View all<ChevronRightIcon size={14} style={{ marginLeft: '0.25rem' }} /></Link>
          </div>
          <div className="mv-table-wrap">
            <table className="mv-table mv-table--stack">
              <caption className="mv-sr-only">Most recent uploaded invoices</caption>
              <thead><tr><th>Invoice</th><th>Provider</th><th>Date</th><th className="mv-num">Amount</th></tr></thead>
              <tbody>
                {summary.latest.map((invoice, index) => (
                  <tr key={invoice.id ?? index}>
                    <td data-label="Invoice" className="mv-stack-title">{invoice.invoice_number ?? `Invoice ${invoice.id ?? index + 1}`}</td>
                    <td data-label="Provider">{PROVIDER_LABEL[invoice.provider as ProviderKey] ?? invoice.provider ?? '—'}</td>
                    <td data-label="Date">{formatDate(invoice.invoice_date ?? invoice.created_at)}</td>
                    <td data-label="Amount" className="mv-num">{formatCurrency(Number(invoice.total_cost ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <p><Link className="mv-secondary-button" to="/invoices"><UploadIcon size={14} style={{ marginRight: '0.375rem' }} />Upload more invoices</Link></p>
    </section>
  );
}
