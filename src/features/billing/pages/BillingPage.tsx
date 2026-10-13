import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import { useBilling } from '../model/BillingContext';
import { SELF_CUSTOMER_ID } from '../../../demo/billing/mockBillingData';
import { CustomerBillingView } from '../components/CustomerBillingView';

/**
 * Read-only for every org role, including admin/owner — creating and
 * managing invoices across organizations is a Maitsys-staff action now
 * (Super Admin's own Billing section), not something reachable from inside
 * any one organization's own login. This page only shows what Maitsys has
 * sent this organization, with Pay Now for anything unpaid.
 */
export function BillingPage() {
  const { customers, invoices, payInvoice } = useBilling();

  return (
    <div>
      <AppBreadcrumb items={[{ label: 'Cloud Cost', path: '/cloud/overview' }, { label: 'Billing' }]} />
      <div className="mv-page-heading">
        <div><h1 className="mv-title">Billing</h1><p className="mv-subtitle">View and pay your invoices from Maitsys.</p></div>
      </div>

      <CustomerBillingView invoices={invoices.filter((inv) => inv.customerId === SELF_CUSTOMER_ID)} customer={customers.find((c) => c.id === SELF_CUSTOMER_ID)} onPay={payInvoice} />
    </div>
  );
}
