import { useMemo, useState, type ChangeEvent } from 'react';
import { oneOf, useRememberedState } from '../../../shared/lib/useRememberedState';
import { useAuth } from '../../auth';
import { derivePermissions } from '../../../shared/lib/permissions';
import { cssVars } from '../../../shared/lib/cssVars';
import { fireToast } from '../../../shared/lib/toastEvents';
import { invoicesRepository } from '../../../data-access';
import { useConfirm } from '../../../shared/ui/ConfirmProvider';
import { SegmentedToggle } from '../../../shared/ui/SegmentedToggle';
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
import { CspSavingsBlock } from '../components/CspSavingsBlock';
import {
  PROVIDER_LABELS,
  buildFakeParsedInvoice,
  cspBreakdownOf,
  filterByProvider,
  formatCurrency,
  formatDate,
  invoiceKpisOf,
  monthLabel,
  paginate,
  providerCountsOf,
} from '../model/invoicesDerivations';
import type { Invoice, ProviderFilter } from '../model/invoicesTypes';
import type { CloudProvider } from '../../../shared/types/auth';
import { PageHeader } from '../../../shared/ui/PageHeader';

const PROVIDER_FILTERS: ProviderFilter[] = ['all', 'azure', 'aws', 'btp', 'gcp'];
const PAGE_SIZE = 6;

function MetaChip({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: 'var(--mv-surface-subtle)' }}>
      <p className="mv-muted" style={{ margin: 0, fontSize: '0.75rem', fontWeight: 500 }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', fontWeight: 500 }}>{value}</p>
    </div>
  );
}

function BillingKpi({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return (
    <article className="mv-kpi" style={{ minHeight: 'auto', padding: '0.875rem' }}>
      <span className="mv-kpi-label">{label}</span>
      <strong className="mv-kpi-value" style={{ fontSize: '1.25rem', marginTop: '0.5rem', color: tone === 'success' ? 'var(--mv-success)' : undefined }}>{value}</strong>
    </article>
  );
}

function ProgressRow({ label, amount, total, sub }: { label: string; amount: number; total: number; sub?: string }) {
  const pct = total > 0 ? Math.min(100, (amount / total) * 100) : 0;
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span>{formatCurrency(amount)}</span>
      </div>
      <div style={{ height: '0.375rem', borderRadius: '62.4375rem', background: 'var(--mv-surface-subtle)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: '62.4375rem', background: 'var(--mv-primary)' }} />
      </div>
      {sub && <p className="mv-muted" style={{ margin: '0.25rem 0 0', fontSize: '0.6875rem' }}>{sub}</p>}
    </div>
  );
}

function InvoiceDetail({ invoice, onDelete, onClose }: { invoice: Invoice; onDelete: (invoice: Invoice) => void; onClose: () => void }) {
  const meta = invoice.raw_summary;
  const isBtp = invoice.provider === 'btp';
  const breakdown = cspBreakdownOf(invoice);
  const hasBreakdown = breakdown.rows.length > 0;
  const btpGlobalTotal = meta.globalAccountCosts?.reduce((s, c) => s + c.cost, 0) ?? 0;
  const btpSubTotal = meta.subaccountCosts?.reduce((s, c) => s + c.totalCost, 0) ?? 0;

  return (
    <section className="mv-panel" aria-label={`Invoice ${meta.invoiceNumber ?? invoice.file_name}`}>
      <div className="mv-panel-header">
        <div>
          <span className="mv-status mv-status--neutral">{PROVIDER_LABELS[invoice.provider]}</span>
          <h2 className="mv-panel-title" style={{ marginTop: '0.375rem' }}>{meta.invoiceNumber ?? invoice.file_name}</h2>
          <p className="mv-muted" style={{ margin: '2px 0 0', fontSize: '0.75rem' }}>{invoice.file_name}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="mv-icon-button" aria-label="Delete invoice" onClick={() => onDelete(invoice)}><TrashIcon size={16} /></button>
          <button className="mv-icon-button" aria-label="Close detail" onClick={onClose}><CloseIcon size={16} /></button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <MetaChip label="Profile" value={meta.billingProfile} />
        <MetaChip label="PO" value={meta.poNumber} />
        <MetaChip label="Period" value={meta.billingPeriodStart ? `${formatDate(meta.billingPeriodStart)} – ${formatDate(meta.billingPeriodEnd)}` : undefined} />
        <MetaChip label="Invoice Date" value={formatDate(meta.invoiceDate)} />
        <MetaChip label="Due" value={formatDate(meta.dueDate)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(8.75rem, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <BillingKpi label="Total Amount" value={formatCurrency(invoice.total_cost, invoice.currency)} />
        <BillingKpi label="Pre-tax Charges" value={formatCurrency(meta.charges ?? invoice.total_cost - (meta.taxAmount ?? 0))} />
        <BillingKpi label="Sales Tax" value={`${formatCurrency(meta.taxAmount ?? 0)}${meta.taxRate ? ` (${(meta.taxRate * 100).toFixed(1)}%)` : ''}`} />
        {hasBreakdown ? <BillingKpi label="CSP Savings" value={formatCurrency(breakdown.total, invoice.currency)} tone="success" /> : null}
      </div>

      {isBtp && (
        <>
          {meta.accountInfo && (
            <div className="mv-panel" style={{ marginBottom: '1rem' }}>
              <h3 className="mv-panel-title" style={{ fontSize: '0.875rem', marginBottom: '0.625rem' }}>Account Overview</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <MetaChip label="Directories" value={String(meta.accountInfo.numDirectories)} />
                <MetaChip label="Subaccounts" value={String(meta.accountInfo.numSubaccounts)} />
                <MetaChip label="Regions" value={String(meta.accountInfo.numRegions)} />
                <MetaChip label="Account Type" value={meta.accountInfo.accountType} />
                <MetaChip label="Account ID" value={meta.accountInfo.accountId} />
                <MetaChip label="Contract" value={`${formatDate(meta.accountInfo.contractStart)} – ${formatDate(meta.accountInfo.plannedContractEnd)}`} />
              </div>
            </div>
          )}

          {(meta.globalAccountCosts?.length || meta.subaccountCosts?.length) ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 16.25rem), 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="mv-panel">
                <h3 className="mv-panel-title" style={{ fontSize: '0.875rem', marginBottom: '0.625rem' }}>Global Account Costs</h3>
                {(meta.globalAccountCosts ?? []).map((c) => <ProgressRow key={c.name} label={c.name} amount={c.cost} total={btpGlobalTotal} sub={c.usage ?? c.planName} />)}
              </div>
              <div className="mv-panel">
                <h3 className="mv-panel-title" style={{ fontSize: '0.875rem', marginBottom: '0.625rem' }}>Subaccount Costs</h3>
                {(meta.subaccountCosts ?? []).map((c) => <ProgressRow key={c.name} label={`${c.name}${c.dataCenter ? ` · ${c.dataCenter}` : ''}`} amount={c.totalCost} total={btpSubTotal} sub={c.directory} />)}
              </div>
            </div>
          ) : null}
        </>
      )}

      {hasBreakdown ? (
        <CspSavingsBlock invoice={invoice} breakdown={breakdown} />
      ) : !isBtp && (
        <div className="mv-empty" style={{ margin: 0 }}>
          <div className="mv-empty-icon" aria-hidden><FileTextIcon size={28} /></div>
          <h2>Service breakdown not extracted</h2>
          <p>Re-upload the PDF — service parsing requires a text-based (not scanned) PDF.</p>
        </div>
      )}

      {meta.sections && meta.sections.length > 0 && (
        <div className="mv-panel" style={{ marginTop: '1rem' }}>
          <h3 className="mv-panel-title" style={{ fontSize: '0.875rem', marginBottom: '0.625rem' }}>Section Breakdown</h3>
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
        <p className="mv-subtitle" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>PDF or XLSX — Azure/AWS/BTP/GCP</p>

        {status === 'done' ? (
          <div className="mv-success">
            <CheckIcon size={28} style={{ color: 'var(--mv-success)' }} />
            <h3>{fileName} parsed and saved.</h3>
          </div>
        ) : status === 'parsing' ? (
          <div className="mv-success">
            <div className="mv-loading" />
            <p style={{ marginTop: '0.75rem' }}>Parsing invoice… This may take a few seconds.</p>
          </div>
        ) : (
          <>
            <Select
              label="Provider"
              style={{ height: '2.75rem' }}
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
              <button className="mv-primary-button" disabled={!fileName || !!error} onClick={submit}><UploadIcon size={16} style={{ marginRight: '0.375rem' }} />Upload Invoice</button>
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
  const confirm = useConfirm();
  const [invoices, setInvoices] = useState<Invoice[]>(() => invoicesRepository.list());
  const [providerFilter, setProviderFilter] = useRememberedState<ProviderFilter>('cloud', 'invoices-provider', 'all', oneOf(PROVIDER_FILTERS));
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const kpis = invoiceKpisOf(invoices);
  const providerCounts = providerCountsOf(invoices);
  const filtered = filterByProvider(invoices, providerFilter);
  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const pageItems = paginate(filtered, safePage, PAGE_SIZE);
  const selected = useMemo(() => invoices.find((inv) => inv.id === selectedId) ?? null, [invoices, selectedId]);

  const allowedProviders = (['azure', 'aws', 'btp', 'gcp'] as CloudProvider[]).filter((p) => permissions[p].canWrite);

  const changeFilter = (f: ProviderFilter) => { setProviderFilter(f); setPage(1); };

  const handleDelete = async (invoice: Invoice) => {
    const name = invoice.raw_summary.invoiceNumber ?? invoice.file_name;
    const ok = await confirm({
      title: `Delete invoice ${name}?`,
      description: `${PROVIDER_LABELS[invoice.provider]} ${monthLabel(invoice.month, invoice.year)}, ${formatCurrency(invoice.total_cost, invoice.currency)}. It leaves this list, the savings totals and the Cost Overview invoices view. Sample data: it comes back when you reload.`,
      variant: 'delete',
      okText: 'Delete invoice',
    });
    if (!ok) return;
    invoicesRepository.remove(invoice.id);
    setInvoices(invoicesRepository.list());
    if (selectedId === invoice.id) setSelectedId(null);
    fireToast({ type: 'success', message: `Invoice ${name} deleted.` });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setInvoices(invoicesRepository.list());
    window.setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <div>
      <PageHeader title="Cloud Invoices" subtitle={<>Upload Azure, AWS, SAP BTP & GCP invoices · instant visual breakdown.</>}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="mv-secondary-button" disabled={refreshing} onClick={handleRefresh}><RefreshIcon size={16} style={{ marginRight: '0.375rem' }} />{refreshing ? 'Refreshing…' : 'Refresh'}</button>
          <button className="mv-primary-button" onClick={() => setUploadOpen(true)}><UploadIcon size={16} style={{ marginRight: '0.375rem' }} />Upload Invoice</button>
        </div>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(9.375rem, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <article className="mv-kpi" style={{ minHeight: 'auto', padding: '0.875rem' }}><span className="mv-kpi-label">Total Invoices</span><strong className="mv-kpi-value" style={{ fontSize: '1.375rem', marginTop: '0.5rem' }}>{kpis.totalCount}</strong><p className="mv-muted" style={{ margin: '0.25rem 0 0', fontSize: '0.6875rem' }}>all providers</p></article>
        {(['azure', 'aws', 'btp', 'gcp'] as CloudProvider[]).map((p) => (
          <article key={p} className="mv-kpi" style={{ minHeight: 'auto', padding: '0.875rem' }}><span className="mv-kpi-label">{PROVIDER_LABELS[p]}</span><strong className="mv-kpi-value" style={{ fontSize: '1.375rem', marginTop: '0.5rem' }}>{kpis.countByProvider[p]}</strong></article>
        ))}
        <article className="mv-kpi" style={{ minHeight: 'auto', padding: '0.875rem' }}><span className="mv-kpi-label">Total Spend</span><strong className="mv-kpi-value" style={{ fontSize: '1.375rem', marginTop: '0.5rem' }}>{formatCurrency(kpis.totalSpend)}</strong><p className="mv-muted" style={{ margin: '0.25rem 0 0', fontSize: '0.6875rem' }}>{kpis.latestMonthLabel ? `Latest: ${kpis.latestMonthLabel}` : 'across all invoices'}</p></article>
      </div>

      <div className="mv-split-panel" style={cssVars({ '--mv-cols': '2fr 3fr' })}>
        <div>
          <section className="mv-panel" style={{ marginBottom: '0.75rem' }}>
            <div className="mv-panel-header">
              <h2 className="mv-panel-title" style={{ fontSize: '0.9375rem' }}>Invoice Records</h2>
              <span className="mv-status mv-status--neutral">{filtered.length}</span>
            </div>
            <SegmentedToggle<ProviderFilter>
              label="Invoice provider"
              className="mv-invoice-filter"
              value={providerFilter}
              onChange={changeFilter}
              options={PROVIDER_FILTERS.map((f) => {
                const name = f === 'all' ? 'All' : PROVIDER_LABELS[f];
                return { value: f, label: <>{name}<span className="mv-chip-count">{providerCounts[f]}</span></>, ariaLabel: `${f === 'all' ? 'All providers' : name}, ${providerCounts[f]} ${providerCounts[f] === 1 ? 'invoice' : 'invoices'}` };
              })}
            />

            {pageItems.length === 0 ? (
              <div className="mv-empty" style={{ margin: 0 }}>
                <div className="mv-empty-icon" aria-hidden><FileTextIcon size={28} /></div>
                <h2>No invoices yet</h2>
                <p>Upload your first invoice to start tracking spend.</p>
                <button className="mv-primary-button" onClick={() => setUploadOpen(true)}>Upload Invoice</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {pageItems.map((inv) => (
                  <button
                    key={inv.id}
                    type="button"
                    aria-pressed={selectedId === inv.id}
                    onClick={() => setSelectedId(selectedId === inv.id ? null : inv.id)}
                    style={{
                      textAlign: 'left', border: `1px solid ${selectedId === inv.id ? 'var(--mv-primary)' : 'var(--mv-border)'}`,
                      borderRadius: '0.625rem', padding: '0.75rem', background: selectedId === inv.id ? 'var(--mv-selected)' : 'transparent', cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                          <span className="mv-status mv-status--neutral" style={{ fontSize: '0.625rem' }}>{PROVIDER_LABELS[inv.provider]}</span>
                          <strong style={{ fontSize: '0.8125rem' }}>{monthLabel(inv.month, inv.year)}</strong>
                        </div>
                        <p className="mv-muted" style={{ margin: '0.1875rem 0 0', fontSize: '0.6875rem' }}>{inv.raw_summary.invoiceNumber ?? inv.file_name}</p>
                        {inv.raw_summary.billingProfile && <p className="mv-muted" style={{ margin: '2px 0 0', fontSize: '0.6875rem' }}>{inv.raw_summary.billingProfile}</p>}
                      </div>
                      <div style={{ textAlign: 'right', flex: 'none' }}>
                        <strong style={{ fontSize: '0.875rem' }}>{formatCurrency(inv.total_cost, inv.currency)}</strong>
                        {inv.raw_summary.dueDate && <p className="mv-muted" style={{ margin: '0.1875rem 0 0', fontSize: '0.625rem' }}>Due {formatDate(inv.raw_summary.dueDate)}</p>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <Pagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} noun="invoices" />
        </div>

        {selected ? (
          <InvoiceDetail invoice={selected} onDelete={(inv) => { void handleDelete(inv); }} onClose={() => setSelectedId(null)} />
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
            invoicesRepository.add(invoice);
            setInvoices(invoicesRepository.list());
            fireToast({ type: 'success', message: `${invoice.file_name} uploaded and added to your invoices.` });
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
