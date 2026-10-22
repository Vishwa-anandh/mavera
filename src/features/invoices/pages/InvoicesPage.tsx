import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { oneOf, useRememberedState } from '../../../shared/lib/useRememberedState';
import { useAuth } from '../../auth';
import { derivePermissions } from '../../../shared/lib/permissions';
import { cssVars } from '../../../shared/lib/cssVars';
import { fireToast } from '../../../shared/lib/toastEvents';
import { useOpenOnArrival } from '../../../shared/lib/useOpenOnArrival';
import { invoicesRepository } from '../../../data-access';
import { SegmentedToggle } from '../../../shared/ui/SegmentedToggle';
import { Pagination } from '../../../shared/ui/Pagination';
import {
  CloseIcon,
  FileTextIcon,
  RefreshIcon,
  TrashIcon,
  UploadIcon,
  PercentIcon,
} from '../../../shared/ui/icons';
import { CspSavingsBlock } from '../components/CspSavingsBlock';
import { UploadInvoiceDialog, type UploadStart } from '../components/UploadInvoiceDialog';
import {
  PROVIDER_LABELS,
  cspBreakdownOf,
  detectInvoiceUpload,
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
import { invoiceFileProblem } from '../../../shared/lib/parseInvoice';
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
  const [invoices, setInvoices] = useState<Invoice[]>(() => invoicesRepository.list());
  const [providerFilter, setProviderFilter] = useRememberedState<ProviderFilter>('cloud', 'invoices-provider', 'all', oneOf(PROVIDER_FILTERS));
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadStart, setUploadStart] = useState<UploadStart | null>(null);
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const kpis = invoiceKpisOf(invoices);
  const providerCounts = providerCountsOf(invoices);
  const filtered = filterByProvider(invoices, providerFilter);
  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const pageItems = paginate(filtered, safePage, PAGE_SIZE);
  const selected = useMemo(() => invoices.find((inv) => inv.id === selectedId) ?? null, [invoices, selectedId]);

  const allowedProviders = (['azure', 'aws', 'btp', 'gcp'] as CloudProvider[]).filter((p) => permissions[p].canWrite);

  const changeFilter = (f: ProviderFilter) => { setProviderFilter(f); setPage(1); };

  /** Deletes at once and offers Undo: the invoice goes back where it was, and is selected again if it was open. */
  const handleDelete = (invoice: Invoice) => {
    const name = invoice.raw_summary.invoiceNumber ?? invoice.file_name;
    const index = invoicesRepository.list().findIndex((inv) => inv.id === invoice.id);
    if (!invoicesRepository.remove(invoice.id)) return;
    setInvoices(invoicesRepository.list());
    const wasSelected = selectedId === invoice.id;
    if (wasSelected) setSelectedId(null);
    fireToast({
      type: 'success',
      message: `Invoice ${name} deleted.`,
      action: {
        label: 'Undo',
        onClick: () => {
          invoicesRepository.restore(invoice, Math.max(index, 0));
          setInvoices(invoicesRepository.list());
          if (wasSelected) setSelectedId(invoice.id);
        },
      },
    });
  };

  /** A file arrived from the chooser or a drop: start under the provider its name points to, or ask when the name does not say. */
  const receiveFile = (file: File) => {
    if (uploadOpen) return; // the open dialog has its own drop zone
    const found = detectInvoiceUpload(file.name, allowedProviders);
    if (found.problem || !found.provider) {
      fireToast({ type: 'error', message: `${file.name}: ${found.problem ?? 'this file cannot be uploaded.'}` });
      return;
    }
    const unusable = invoiceFileProblem(file);
    if (unusable) { fireToast({ type: 'error', message: unusable }); return; }
    setUploadStart({ fileName: file.name, sizeBytes: file.size, provider: found.provider, confident: found.confident });
    setUploadOpen(true);
  };

  /** The header and empty-state buttons open the parser dialog: provider chips, drop zone, Parse button. */
  const openUploadDialog = () => { setUploadStart(null); setUploadOpen(true); };

  const chooseFile = () => {
    if (allowedProviders.length === 0) { openUploadDialog(); return; }
    fileInputRef.current?.click();
  };

  const onFileChosen = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) receiveFile(file);
  };

  // Ctrl+K "Upload invoice" lands here and goes straight to the file chooser; without a fresh click or key press the
  // browser would refuse the chooser, so the dialog (which has its own) opens instead.
  useOpenOnArrival('upload', () => {
    const activation = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation;
    if (activation?.isActive) chooseFile();
    else openUploadDialog();
  });

  // A file dropped anywhere on the page starts an upload; without these handlers the browser would open the file instead.
  const receiveRef = useRef(receiveFile);
  useEffect(() => { receiveRef.current = receiveFile; });
  useEffect(() => {
    let depth = 0;
    const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files');
    const enter = (event: DragEvent) => { if (!hasFiles(event)) return; event.preventDefault(); depth += 1; setDragging(true); };
    const over = (event: DragEvent) => { if (hasFiles(event)) event.preventDefault(); };
    const leave = (event: DragEvent) => { if (!hasFiles(event)) return; depth = Math.max(0, depth - 1); if (depth === 0) setDragging(false); };
    const drop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length === 0) return;
      if (files.length > 1) fireToast({ type: 'info', message: `Uploading ${files[0].name}. Drop the other files one at a time.` });
      receiveRef.current(files[0]);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setInvoices(invoicesRepository.list());
    window.setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <div>
      <input ref={fileInputRef} type="file" className="mv-sr-only" accept=".pdf,.xlsx" aria-label="Invoice file (PDF, or XLSX for SAP BTP)" tabIndex={-1} onChange={onFileChosen} />
      {dragging && !uploadOpen && <div className="mv-drop-overlay" role="status">Drop your invoice anywhere to upload it</div>}
      <PageHeader title="Cloud Invoices" subtitle={<>Upload Azure, AWS, SAP BTP & GCP invoices · instant visual breakdown. Drop a PDF or XLSX anywhere on this page.</>}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="mv-secondary-button" disabled={refreshing} onClick={handleRefresh}><RefreshIcon size={16} style={{ marginRight: '0.375rem' }} />{refreshing ? 'Refreshing…' : 'Refresh'}</button>
          <button className="mv-primary-button" onClick={openUploadDialog}><UploadIcon size={16} style={{ marginRight: '0.375rem' }} />Upload Invoice</button>
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
                <button className="mv-primary-button" onClick={openUploadDialog}>Upload Invoice</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {pageItems.map((inv) => {
                  const invName = inv.raw_summary.invoiceNumber ?? inv.file_name;
                  const isSelected = selectedId === inv.id;
                  return (
                    <div key={inv.id} className={`mv-cinv-row${isSelected ? ' is-selected' : ''}`}>
                      <button
                        type="button"
                        className="mv-cinv-row-main"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedId(isSelected ? null : inv.id)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                              <span className="mv-status mv-status--neutral" style={{ fontSize: '0.625rem' }}>{PROVIDER_LABELS[inv.provider]}</span>
                              <strong style={{ fontSize: '0.8125rem' }}>{monthLabel(inv.month, inv.year)}</strong>
                            </div>
                            <p className="mv-muted" style={{ margin: '0.1875rem 0 0', fontSize: '0.6875rem' }}>{invName}</p>
                            {inv.raw_summary.billingProfile && <p className="mv-muted" style={{ margin: '2px 0 0', fontSize: '0.6875rem' }}>{inv.raw_summary.billingProfile}</p>}
                          </div>
                          <div style={{ textAlign: 'right', flex: 'none' }}>
                            <strong style={{ fontSize: '0.875rem' }}>{formatCurrency(inv.total_cost, inv.currency)}</strong>
                            {inv.raw_summary.dueDate && <p className="mv-muted" style={{ margin: '0.1875rem 0 0', fontSize: '0.625rem' }}>Due {formatDate(inv.raw_summary.dueDate)}</p>}
                          </div>
                        </div>
                      </button>
                      <button type="button" className="mv-icon-button mv-cinv-row-delete" aria-label={`Delete invoice ${invName}`} onClick={() => handleDelete(inv)}><TrashIcon size={16} /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <Pagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} noun="invoices" />
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
        <UploadInvoiceDialog
          key={uploadStart?.fileName ?? 'manual'}
          allowedProviders={allowedProviders}
          start={uploadStart}
          onClose={() => { setUploadOpen(false); setUploadStart(null); }}
          onCreated={(invoice) => {
            invoicesRepository.add(invoice);
            setInvoices(invoicesRepository.list());
            fireToast({ type: 'success', message: `${invoice.file_name} uploaded and added to your invoices.` });
            setSelectedId(invoice.id);
            setProviderFilter('all');
            setPage(1);
          }}
        />
      )}
    </div>
  );
}
