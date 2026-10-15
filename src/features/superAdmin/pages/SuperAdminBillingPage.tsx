import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBilling } from '../../billing';
import { InvoicesTab } from '../../billing';
import { PaymentTermsTab } from '../../billing';
import { PlusIcon, UsersIcon } from '../../../shared/ui/icons';
import { PageHeader } from '../../../shared/ui/PageHeader';

/**
 * Maitsys-staff-only invoicing console — creating invoices, payment terms
 * and the master customer list are all cross-organization actions, so they
 * live here rather than inside any one org's own login (see BillingPage.tsx
 * for the read-only view an org gets of the invoices sent to it).
 */
export function SuperAdminBillingPage() {
  const { customers, terms, setTerms, invoices } = useBilling();
  const [tab, setTab] = useState<'invoices' | 'terms'>('invoices');
  const navigate = useNavigate();

  return (
    <div className="mv-sa-content">
      <PageHeader title="Billing" subtitle="Invoice organizations and manage payment terms — sent invoices appear in that organization's own Billing page.">
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="mv-secondary-button" onClick={() => navigate('/admin/billing/customers')}>
            <UsersIcon size={16} style={{ marginRight: 6 }} />Manage Customers
          </button>
          <button className="mv-primary-button" onClick={() => navigate('/admin/billing/generate')}>
            <PlusIcon size={16} style={{ marginRight: 6 }} />New Invoice
          </button>
        </div>
      </PageHeader>

      <div className="mv-segmented" style={{ marginBottom: 20 }}>
        <button className={`mv-segmented-btn${tab === 'invoices' ? ' is-active' : ''}`} onClick={() => setTab('invoices')}>Invoices</button>
        <button className={`mv-segmented-btn${tab === 'terms' ? ' is-active' : ''}`} onClick={() => setTab('terms')}>Payment Terms</button>
      </div>
      {tab === 'invoices' ? <InvoicesTab invoices={invoices} customers={customers} /> : <PaymentTermsTab terms={terms} onChange={setTerms} />}
    </div>
  );
}
