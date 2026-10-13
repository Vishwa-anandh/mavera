import { useState, type FormEvent } from 'react';
import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import type { Customer } from '../../../shared/domain/billing/billingTypes';
import { CUSTOMERS } from '../../../demo/billing/mockBillingData';
import { TrashIcon, PlusIcon, BuildingIcon } from '../../../shared/ui/icons';
import { cssVars } from '../../../shared/lib/cssVars';

let nextCustomerId = 100;
const emptyForm = { name: '', billingAddress: '', shippingAddress: '', sameAsBilling: true, primaryContactEmail: '', discountPct: '0' };

/**
 * Customer record management — its own destination, deliberately separate
 * from invoicing itself (matches the reference's own code comment: "a
 * distinct workflow from invoicing"). Payment terms and invoices live
 * elsewhere in Billing; this page only manages who Maitsys bills.
 */
export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(CUSTOMERS);
  const [form, setForm] = useState(emptyForm);

  const createCustomer = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.primaryContactEmail.trim()) return;
    const billingAddress = form.billingAddress.trim();
    setCustomers((current) => [...current, {
      id: `cust-${nextCustomerId++}`,
      name: form.name.trim(),
      orgId: null,
      billingAddress,
      shippingAddress: form.sameAsBilling ? billingAddress : form.shippingAddress.trim(),
      primaryContactEmail: form.primaryContactEmail.trim(),
      discountPct: Number(form.discountPct) || 0,
      active: true,
    }]);
    setForm(emptyForm);
  };

  const removeCustomer = (id: string) => setCustomers((current) => current.filter((c) => c.id !== id));
  const toggleActive = (id: string) => setCustomers((current) => current.map((c) => (c.id === id ? { ...c, active: !c.active } : c)));

  return (
    <div>
      <AppBreadcrumb items={[{ label: 'Billing', path: '/admin/billing' }, { label: 'Customers' }]} />
      <div className="mv-page-heading">
        <div><h1 className="mv-title">Customers</h1><p className="mv-subtitle">Manage the companies Maitsys invoices.</p></div>
      </div>

      <div className="mv-columns-16-8" style={cssVars({ '--mv-cols': '1fr 2fr' })}>
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">Add Customer</h2></div>
          <form onSubmit={createCustomer}>
            <label className="mv-field">Customer Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Northwind Traders" /></label>
            <label className="mv-field">Primary Contact Email<input required type="email" value={form.primaryContactEmail} onChange={(e) => setForm({ ...form, primaryContactEmail: e.target.value })} placeholder="ap@company.com" /></label>
            <label className="mv-field">Billing Address<textarea rows={3} value={form.billingAddress} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} placeholder={'Street\nCity, State ZIP'} /></label>
            <label className="mv-field" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.sameAsBilling} onChange={(e) => setForm({ ...form, sameAsBilling: e.target.checked })} style={{ width: 'auto' }} />
              Shipping address same as billing
            </label>
            {!form.sameAsBilling && <label className="mv-field">Shipping Address<textarea rows={3} value={form.shippingAddress} onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })} /></label>}
            <label className="mv-field">Standard Discount %<input type="number" min={0} max={100} value={form.discountPct} onChange={(e) => setForm({ ...form, discountPct: e.target.value })} /></label>
            <button className="mv-primary-button" type="submit" style={{ width: '100%' }}><PlusIcon size={16} style={{ marginRight: 6 }} />Add Customer</button>
          </form>
        </section>

        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          {customers.map((c) => (
            <section className="mv-panel" key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <BuildingIcon size={20} style={{ marginTop: 2, flex: 'none' }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{c.name}</h3>
                    <span className={`mv-status ${c.active ? 'mv-status--success' : 'mv-status--neutral'}`}>{c.active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <p className="mv-muted" style={{ margin: '4px 0 0' }}>{c.primaryContactEmail}{c.discountPct > 0 ? ` · ${c.discountPct}% standard discount` : ''}</p>
                  <p className="mv-muted" style={{ margin: '2px 0 0', whiteSpace: 'pre-line', fontSize: 12 }}>{c.billingAddress}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="mv-secondary-button" onClick={() => toggleActive(c.id)}>{c.active ? 'Deactivate' : 'Activate'}</button>
                <button className="mv-icon-button" aria-label={`Delete ${c.name}`} onClick={() => removeCustomer(c.id)}><TrashIcon size={18} /></button>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
