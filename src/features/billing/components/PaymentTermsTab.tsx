import { useState, type FormEvent } from 'react';
import type { PaymentTerm } from '../../../shared/domain/billing/billingTypes';
import { TrashIcon, PlusIcon } from '../../../shared/ui/icons';
import { cssVars } from '../../../shared/lib/cssVars';

let nextTermId = 1;

interface PaymentTermsTabProps {
  terms: PaymentTerm[];
  onChange: (terms: PaymentTerm[]) => void;
}

/** Simple CRUD over `{name, days}` presets — e.g. "Net 30". Picked at
 * invoice-creation time; the invoice stores a day-count snapshot, not a
 * live reference, so editing/deleting a term never changes past invoices. */
export function PaymentTermsTab({ terms, onChange }: PaymentTermsTabProps) {
  const [name, setName] = useState('');
  const [days, setDays] = useState('30');

  const addTerm = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !days) return;
    onChange([...terms, { id: `term-${nextTermId++}`, name: name.trim(), days: Number(days) }]);
    setName('');
    setDays('30');
  };

  const removeTerm = (id: string) => onChange(terms.filter((t) => t.id !== id));

  return (
    <div className="mv-columns-16-8" style={cssVars({ '--mv-cols': '1fr 2fr' })}>
      <section className="mv-panel">
        <div className="mv-panel-header"><h2 className="mv-panel-title">Add Payment Term</h2></div>
        <form onSubmit={addTerm}>
          <label className="mv-field">Name<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Net 45" /></label>
          <label className="mv-field">Days<input required type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} /></label>
          <button className="mv-primary-button" type="submit" style={{ width: '100%' }}><PlusIcon size={16} style={{ marginRight: 6 }} />Add Term</button>
        </form>
      </section>
      <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
        {terms.map((t) => (
          <section className="mv-panel" key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{t.name}</h3><p className="mv-muted" style={{ margin: '4px 0 0' }}>{t.days} days from invoice date</p></div>
            <button className="mv-icon-button" aria-label={`Delete ${t.name}`} onClick={() => removeTerm(t.id)}><TrashIcon size={18} /></button>
          </section>
        ))}
        {terms.length === 0 && <p className="mv-muted">No payment terms yet.</p>}
      </div>
    </div>
  );
}
