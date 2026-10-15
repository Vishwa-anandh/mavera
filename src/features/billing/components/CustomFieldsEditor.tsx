import type { CustomField } from '../../../shared/domain/billing/billingTypes';
import { PlusIcon, TrashIcon } from '../../../shared/ui/icons';

let nextFieldId = 1;

interface CustomFieldsEditorProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
}

/** Arbitrary header-level label/value pairs (e.g. "PO Number") — distinct
 * from InvoiceColumn/extra, which is per-line-item, not header-level. */
export function CustomFieldsEditor({ fields, onChange }: CustomFieldsEditorProps) {
  const addField = () => onChange([...fields, { id: `field-${nextFieldId++}`, label: '', value: '' }]);
  const updateField = (id: string, patch: Partial<CustomField>) => onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const removeField = (id: string) => onChange(fields.filter((f) => f.id !== id));

  return (
    <div style={{ marginBottom: '1.125rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <p className="mv-muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Custom Fields</p>
        <button type="button" className="mv-quiet-button" onClick={addField}><PlusIcon size={14} style={{ marginRight: '0.25rem' }} />Add Field</button>
      </div>
      {fields.length === 0 ? (
        <p className="mv-muted" style={{ fontSize: '0.75rem' }}>No custom fields added.</p>
      ) : (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {fields.map((field) => (
            <div key={field.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input className="mv-select" placeholder="Label (e.g. Contract Ref)" value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} style={{ flex: 1 }} />
              <input className="mv-select" placeholder="Value" value={field.value} onChange={(e) => updateField(field.id, { value: e.target.value })} style={{ flex: 1 }} />
              <button type="button" className="mv-icon-button" aria-label="Remove field" onClick={() => removeField(field.id)}><TrashIcon size={15} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
