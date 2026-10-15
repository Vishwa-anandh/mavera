import { useMemo, useState, type ChangeEvent } from 'react';
import { oneOf, useRememberedState } from '../../../shared/lib/useRememberedState';
import { useAuth } from '../../auth';
import { derivePermissions } from '../../../shared/lib/permissions';
import { cssVars } from '../../../shared/lib/cssVars';
import { DonutChart } from '../../../shared/ui/DonutChart';
import { Select } from '../../../shared/ui/Select';
import { Pagination } from '../../../shared/ui/Pagination';
import {
  CheckIcon,
  CloseIcon,
  FileTextIcon,
  RefreshIcon,
  TrashIcon,
  UploadIcon,
  PercentIcon,
} from '../../../shared/ui/icons';
import { MOCK_INVOICES } from '../../../demo/invoices/mockInvoicesData';
import {
  CSP_RATES,
  PROVIDER_LABELS,
  buildFakeParsedInvoice,
  filterByProvider,
  formatCurrency,
  formatDate,
  invoiceKpisOf,
  monthLabel,
  paginate,
  serviceSavingsRowsOf,
  totalSavingsOf,
} from '../model/invoicesDerivations';
import type { Invoice, ProviderFilter } from '../model/invoicesTypes';
import type { CloudProvider } from '../../../shared/types/auth';
import { PageHeader } from '../../../shared/ui/PageHeader';

const PROVIDER_FILTERS: ProviderFilter[] = ['all', 'azure', 'aws', 'btp', 'gcp'];
const PAGE_SIZE = 6;
const DONUT_COLORS = ['#175CD3', '#EC7211', '#059669', '#7C3AED', '#DC6803', '#4285F4', '#DB2777', '#65A30D'];

function MetaChip({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--mv-surface-subtle)' }}>
      <p className="mv-muted" style={{ margin: 0, fontSize: 12, fontWeight: 500 }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600 }}>{value}</p>
    </div>
  );
}

function BillingKpi({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return (
    <article className="mv-kpi" style={{ minHeight: 'auto', padding: 14 }}>
      <span className="mv-kpi-label">{label}</span>
      <strong className="mv-kpi-value" style={{ fontSize: 20, marginTop: 8, color: tone === 'success' ? 'var(--mv-success)' : undefined }}>{value}</strong>
    </article>
  );
}

function ProgressRow({ label, amount, total, sub }: { label: string; amount: number; total: number; sub?: string }) {
  const pct = total > 0 ? Math.min(100, (amount / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span>{formatCurrency(amount)}</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: 'var(--mv-surface-subtle)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: 'var(--mv-primary)' }} />
      </div>
      {sub && <p className="mv-muted" style={{ margin: '4px 0 0', fontSize: 11 }}>{sub}</p>}
    </div>
  );
}

function InvoiceDetail({ invoice, onDelete, onClose }: { invoice: Invoice; onDelete: (id: string) => void; onClose: () => void }) {
  const meta = invoice.raw_summary;
  const rate = CSP_RATES[invoice.provider];
  const isBtp = invoice.provider === 'btp';
  const serviceRows = !isBtp ? serviceSavingsRowsOf(invoice.services, invoice.provider) : [];
  const savingsTotal = !isBtp ? totalSavingsOf(serviceRows) : 0;

  const btpGlobalTotal = meta.globalAccountCosts?.reduce((s, c) => s + c.cost, 0) ?? 0;
  const btpSubTotal = meta.subaccountCosts?.reduce((s, c) => s + c.totalCost, 0) ?? 0;
  const btpCspBase = btpGlobalTotal > 0 ? btpGlobalTotal : btpSubTotal;

  return (
    <section className="mv-panel">
      <div className="mv-panel-header">
        <div>
          <span className="mv-status mv-status--neutral">{PROVIDER_LABELS[invoice.provider]}</span>
          <h2 className="mv-panel-title" style={{ marginTop: 6 }}>{meta.invoiceNumber ?? invoice.file_name}</h2>
          <p className="mv-muted" style={{ margin: '2px 0 0', fontSize: 12 }}>{invoice.file_name}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="mv-icon-button" aria-label="Delete invoice" onClick={() => onDelete(invoice.id)}><TrashIcon size={16} /></button>
          <button className="mv-icon-button" aria-label="Close detail" onClick={onClose}><CloseIcon size={16} /></button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <MetaChip label="Profile" value={meta.billingProfile} />
        <MetaChip label="PO" value={meta.poNumber} />
        <MetaChip label="Period" value={meta.billingPeriodStart ? `${formatDate(meta.billingPeriodStart)} – ${formatDate(meta.billingPeriodEnd)}` : undefined} />
        <MetaChip label="Invoice Date" value={formatDate(meta.invoiceDate)} />
        <MetaChip label="Due" value={formatDate(meta.dueDate)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        <BillingKpi label="Total Amount" value={formatCurrency(invoice.total_cost, invoice.currency)} />
        <BillingKpi label="Pre-tax Charges" value={formatCurrency(meta.charges ?? invoice.total_cost - (meta.taxAmount ?? 0))} />
        <BillingKpi label="Sales Tax" value={`${formatCurrency(meta.taxAmount ?? 0)}${meta.taxRate ? ` (${(meta.taxRate * 100).toFixed(1)}%)` : ''}`} />
        {meta.totalSavings ? <BillingKpi label="CSP Savings" value={formatCurrency(meta.totalSavings)} tone="success" /> : null}
      </div>

      {isBtp ? (
        <>
          {meta.accountInfo && (
            <div className="mv-panel" style={{ marginBottom: 16 }}>
              <h3 className="mv-panel-title" style={{ fontSize: 14, marginBottom: 10 }}>Account Overview</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <MetaChip label="Directories" value={String(meta.accountInfo.numDirectories)} />
                <MetaChip label="Subaccounts" value={String(meta.accountInfo.numSubaccounts)} />
                <MetaChip label="Regions" value={String(meta.accountInfo.numRegions)} />
                <MetaChip label="Account Type" value={meta.accountInfo.accountType} />
                <MetaChip label="Account ID" value={meta.accountInfo.accountId} />
                <MetaChip label="Contract" value={`${formatDate(meta.accountInfo.contractStart)} – ${formatDate(meta.accountInfo.plannedContractEnd)}`} />
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div className="mv-panel">
              <h3 className="mv-panel-title" style={{ fontSize: 14, marginBottom: 10 }}>Global Account Costs</h3>
              {(meta.globalAccountCosts ?? []).map((c) => <ProgressRow key={c.name} label={c.name} amount={c.cost} total={btpGlobalTotal} sub={c.usage ?? c.planName} />)}
            </div>
            <div className="mv-panel">
              <h3 className="mv-panel-title" style={{ fontSize: 14, marginBottom: 10 }}>Subaccount Costs</h3>
              {(meta.subaccountCosts ?? []).map((c) => <ProgressRow key={c.name} label={`${c.name}${c.dataCenter ? ` · ${c.dataCenter}` : ''}`} amount={c.totalCost} total={btpSubTotal} sub={c.directory} />)}
            </div>
          </div>

          {btpCspBase > 0 && (
            <div className={`mv-inline-error mv-ai-insight mv-ai-insight--success`} style={{ marginBottom: 16 }}>
              <strong>Maitsys CSP Savings — {(rate * 100).toFixed(0)}% SAP BTP discount</strong>
              <p style={{ margin: '2px 0 0' }}>{formatCurrency(btpCspBase * rate)} saved this billing period on {formatCurrency(btpCspBase)} of SAP BTP consumption.</p>
            </div>
          )}
        </>
      ) : invoice.services.length === 0 ? (
        <div className="mv-empty" style={{ margin: 0 }}>
          <div className="mv-empty-icon" aria-hidden><FileTextIcon size={28} /></div>
          <h2>Service breakdown not extracted</h2>
          <p>Re-upload the PDF — service parsing requires a text-based (not scanned) PDF.</p>
        </div>
      ) : (
        <>
          <div className={`mv-inline-error mv-ai-insight mv-ai-insight--success`} style={{ marginBottom: 16 }}>
            <strong>Maitsys CSP Savings — {(rate * 100).toFixed(1)}% {PROVIDER_LABELS[invoice.provider]} discount</strong>
            <p style={{ margin: '2px 0 0' }}>{formatCurrency(savingsTotal)} saved this billing period across {serviceRows.length} service{serviceRows.length !== 1 ? 's' : ''}.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
            <DonutChart title="Cost by service" totalLabel="Total cost" data={serviceRows.map((r, i) => ({ label: r.name, value: r.cost, color: DONUT_COLORS[i % DONUT_COLORS.length] }))} />
            <div>
              {serviceRows.map((r) => <ProgressRow key={r.name} label={r.name} amount={r.cost} total={invoice.services.reduce((s, x) => s + x.cost, 0)} sub={`${r.sharePct.toFixed(1)}% share · ${formatCurrency(r.savings)} saved`} />)}
            </div>
          </div>

          <div className="mv-table-wrap">
            <table className="mv-table">
              <thead><tr><th>Service</th><th className="mv-num">Cost</th><th className="mv-num">CSP Savings</th></tr></thead>
              <tbody>
                {serviceRows.map((r) => <tr key={r.name}><td>{r.name}</td><td className="mv-num">{formatCurrency(r.cost)}</td><td className="mv-num" style={{ color: 'var(--mv-success)' }}>{formatCurrency(r.savings)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </>
      )}

      {meta.sections && meta.sections.length > 0 && (
        <div className="mv-panel" style={{ marginTop: 16 }}>
          <h3 className="mv-panel-title" style={{ fontSize: 14, marginBottom: 10 }}>Section Breakdown</h3>
          {meta.sections.map((s) => <ProgressRow key={s.name} label={s.name} amount={s.total} total={meta.charges ?? invoice.total_cost} sub={`Tax: ${formatCurrency(s.tax)}`} />)}
        </div>
      )}
    </section>
  );
}

function UploadModal({ allowedProviders, onClose, onCreated }: { allowedProviders: CloudProvider[]; onClose: () => void; onCreated: (invoice: Invoice) => void }) {
  const [provider, setProvider] = useState<CloudProvider | ''>(allowedProviders[0] ?? '');
  const [billingName, setBillingName] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'done'>('idle');

  const expectedExt = provider === 'btp' ? '.xlsx' : '.pdf';

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(expectedExt)) {
      setError(`${PROVIDER_LABELS[provider as CloudProvider] ?? 'This provider'} invoices must be a ${expectedExt} file.`);
      setFileName(null);
      return;
    }
    setError(null);
    setFileName(file.name);
  };

  const submit = () => {
    if (!provider || !fileName) return;
    setStatus('parsing');
    window.setTimeout(() => {
      const invoice = buildFakeParsedInvoice(provider as CloudProvider, fileName, billingName || undefined, new Date());
      setStatus('done');
      window.setTimeout(() => onCreated(invoice), 900);
    }, 1200);
  };

  if (allowedProviders.length === 0) {
    return (
      <div className="mv-dialog-backdrop" onClick={onClose}>
        <section className="mv-dialog" role="dialog" aria-modal="true" aria-label="Upload invoice" onClick={(e) => e.stopPropagation()}>
          <div className="mv-panel-header"><h2 className="mv-panel-title">Upload Invoice</h2><button className="mv-icon-button" aria-label="Close" onClick={onClose}><CloseIcon size={16} /></button></div>
          <div className="mv-inline-error" role="alert">No cloud access — contact your administrator.</div>
        </section>
      </div>
    );
  }

  return (
    <div className="mv-dialog-backdrop" onClick={onClose}>
      <section className="mv-dialog" role="dialog" aria-modal="true" aria-label="Upload invoice" onClick={(e) => e.stopPropagation()}>
        <div className="mv-panel-header"><h2 className="mv-panel-title">Upload Invoice</h2><button className="mv-icon-button" aria-label="Close" onClick={onClose}><CloseIcon size={16} /></button></div>
        <p className="mv-subtitle" style={{ marginTop: -8, marginBottom: 16 }}>PDF or XLSX — Azure/AWS/BTP/GCP</p>

        {status === 'done' ? (
          <div className="mv-success">
            <CheckIcon size={28} style={{ color: 'var(--mv-success)' }} />
            <h3>{fileName} parsed and saved.</h3>
          </div>
        ) : status === 'parsing' ? (
          <div className="mv-success">
            <div className="mv-loading" />
            <p style={{ marginTop: 12 }}>Parsing invoice… This may take a few seconds.</p>
          </div>
        ) : (
          <>
            <Select
              label="Provider"
              style={{ height: 44 }}
              value={provider}
              onChange={(p) => { setProvider(p); setFileName(null); setError(null); }}
              options={allowedProviders.map((p) => ({ value: p, label: PROVIDER_LABELS[p] }))}
            />
            <label className="mv-field">
              Billing Name <span className="mv-field-help" style={{ margin: 0 }}>(optional — used when not found in file)</span>
              <input maxLength={120} value={billingName} onChange={(e) => setBillingName(e.target.value)} placeholder="e.g. Production Subscription" />
            </label>
            <label className="mv-field">
              Invoice File ({expectedExt})
              <input type="file" accept={expectedExt} onChange={handleFile} />
            </label>
            {error && <p className="mv-field-error">{error}</p>}
            {fileName && !error && <p className="mv-field-help" style={{ color: 'var(--mv-success)' }}>Selected: {fileName}</p>}
            <div className="mv-dialog-actions">
              <button className="mv-secondary-button" onClick={onClose}>Cancel</button>
              <button className="mv-primary-button" disabled={!fileName || !!error} onClick={submit}><UploadIcon size={16} style={{ marginRight: 6 }} />Upload Invoice</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

/**
 * Ported from the reference CCM app's InvoicesPage.jsx — visible only to
 * invoice-only and hybrid orgs (see navConfig.ts's `visible` predicate on
 * this nav entry). Parsing is entirely server-side in the reference; there's
 * no backend here, so "Upload Invoice" fakes the parse (see
 * buildFakeParsedInvoice) rather than pulling in a real PDF/XLSX parser with
 * nothing behind it to validate against.
 */
export function InvoicesPage() {
  const { user, cloudAccess, invoiceOnly } = useAuth();
  const permissions = derivePermissions(user, cloudAccess, invoiceOnly);
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [providerFilter, setProviderFilter] = useRememberedState<ProviderFilter>('cloud', 'invoices-provider', 'all', oneOf(PROVIDER_FILTERS));
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const kpis = invoiceKpisOf(invoices);
  const filtered = filterByProvider(invoices, providerFilter);
  const pageItems = paginate(filtered, page, PAGE_SIZE);
  const selected = useMemo(() => invoices.find((inv) => inv.id === selectedId) ?? null, [invoices, selectedId]);

  const allowedProviders = (['azure', 'aws', 'btp', 'gcp'] as CloudProvider[]).filter((p) => permissions[p].canWrite);

  const changeFilter = (f: ProviderFilter) => { setProviderFilter(f); setPage(1); };

  const handleDelete = (id: string) => {
    setInvoices((current) => current.filter((inv) => inv.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <div>
      <PageHeader title="Cloud Invoices" subtitle={<>Upload Azure, AWS, SAP BTP & GCP invoices · instant visual breakdown.</>}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="mv-secondary-button" disabled={refreshing} onClick={handleRefresh}><RefreshIcon size={16} style={{ marginRight: 6 }} />{refreshing ? 'Refreshing…' : 'Refresh'}</button>
          <button className="mv-primary-button" onClick={() => setUploadOpen(true)}><UploadIcon size={16} style={{ marginRight: 6 }} />Upload Invoice</button>
        </div>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <article className="mv-kpi" style={{ minHeight: 'auto', padding: 14 }}><span className="mv-kpi-label">Total Invoices</span><strong className="mv-kpi-value" style={{ fontSize: 22, marginTop: 8 }}>{kpis.totalCount}</strong><p className="mv-muted" style={{ margin: '4px 0 0', fontSize: 11 }}>all providers</p></article>
        {(['azure', 'aws', 'btp', 'gcp'] as CloudProvider[]).map((p) => (
          <article key={p} className="mv-kpi" style={{ minHeight: 'auto', padding: 14 }}><span className="mv-kpi-label">{PROVIDER_LABELS[p]}</span><strong className="mv-kpi-value" style={{ fontSize: 22, marginTop: 8 }}>{kpis.countByProvider[p]}</strong></article>
        ))}
        <article className="mv-kpi" style={{ minHeight: 'auto', padding: 14 }}><span className="mv-kpi-label">Total Spend</span><strong className="mv-kpi-value" style={{ fontSize: 22, marginTop: 8 }}>{formatCurrency(kpis.totalSpend)}</strong><p className="mv-muted" style={{ margin: '4px 0 0', fontSize: 11 }}>{kpis.latestMonthLabel ? `Latest: ${kpis.latestMonthLabel}` : 'across all invoices'}</p></article>
      </div>

      <div className="mv-split-panel" style={cssVars({ '--mv-cols': '2fr 3fr' })}>
        <div>
          <section className="mv-panel" style={{ marginBottom: 12 }}>
            <div className="mv-panel-header">
              <h2 className="mv-panel-title" style={{ fontSize: 15 }}>Invoice Records</h2>
              <span className="mv-status mv-status--neutral">{filtered.length}</span>
            </div>
            <div className="mv-segmented" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
              {PROVIDER_FILTERS.map((f) => (
                <button key={f} className={`mv-segmented-btn${providerFilter === f ? ' is-active' : ''}`} onClick={() => changeFilter(f)}>{f === 'all' ? 'All' : PROVIDER_LABELS[f]}</button>
              ))}
            </div>

            {pageItems.length === 0 ? (
              <div className="mv-empty" style={{ margin: 0 }}>
                <div className="mv-empty-icon" aria-hidden><FileTextIcon size={28} /></div>
                <h2>No invoices yet</h2>
                <p>Upload your first invoice to start tracking spend.</p>
                <button className="mv-primary-button" onClick={() => setUploadOpen(true)}>Upload Invoice</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8, maxHeight: 560, overflowY: 'auto' }}>
                {pageItems.map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => setSelectedId(selectedId === inv.id ? null : inv.id)}
                    style={{
                      textAlign: 'left', border: `1px solid ${selectedId === inv.id ? 'var(--mv-primary)' : 'var(--mv-border)'}`,
                      borderRadius: 10, padding: 12, background: selectedId === inv.id ? 'var(--mv-selected)' : 'transparent', cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span className="mv-status mv-status--neutral" style={{ fontSize: 10 }}>{PROVIDER_LABELS[inv.provider]}</span>
                          <strong style={{ fontSize: 13 }}>{monthLabel(inv.month, inv.year)}</strong>
                        </div>
                        <p className="mv-muted" style={{ margin: '3px 0 0', fontSize: 11 }}>{inv.raw_summary.invoiceNumber ?? inv.file_name}</p>
                        {inv.raw_summary.billingProfile && <p className="mv-muted" style={{ margin: '2px 0 0', fontSize: 11 }}>{inv.raw_summary.billingProfile}</p>}
                      </div>
                      <div style={{ textAlign: 'right', flex: 'none' }}>
                        <strong style={{ fontSize: 14 }}>{formatCurrency(inv.total_cost, inv.currency)}</strong>
                        {inv.raw_summary.dueDate && <p className="mv-muted" style={{ margin: '3px 0 0', fontSize: 10 }}>Due {formatDate(inv.raw_summary.dueDate)}</p>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} noun="invoices" />
        </div>

        {selected ? (
          <InvoiceDetail invoice={selected} onDelete={handleDelete} onClose={() => setSelectedId(null)} />
        ) : (
          <section className="mv-panel">
            <div className="mv-empty" style={{ margin: 0 }}>
              <div className="mv-empty-icon" aria-hidden><PercentIcon size={32} /></div>
              <h2>Select an invoice to analyse</h2>
              <p>Choose a record from the list to see its full cost breakdown and CSP savings.</p>
            </div>
          </section>
        )}
      </div>

      {uploadOpen && (
        <UploadModal
          allowedProviders={allowedProviders}
          onClose={() => setUploadOpen(false)}
          onCreated={(invoice) => {
            setInvoices((current) => [invoice, ...current]);
            setUploadOpen(false);
            setSelectedId(invoice.id);
            setProviderFilter('all');
            setPage(1);
          }}
        />
      )}
    </div>
  );
}
