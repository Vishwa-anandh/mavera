import type { InvoicePreviewProps } from './InvoicePreview';
import { InvoicePreview } from './InvoicePreview';

interface SendInvoiceConfirmModalProps {
  previewProps: InvoicePreviewProps;
  onConfirm: () => void;
  onCancel: () => void;
  sending?: boolean;
}

/** Last checkpoint before actually creating + "sending" the invoice — shows
 * the real InvoicePreview so Finance sees exactly what the customer will
 * receive, not a plain summary table. */
export function SendInvoiceConfirmModal({ previewProps, onConfirm, onCancel, sending }: SendInvoiceConfirmModalProps) {
  return (
    <div className="mv-dialog-backdrop" onClick={sending ? undefined : onCancel}>
      <section className="mv-dialog mv-dialog--wide" role="dialog" aria-modal="true" aria-label="Confirm and send invoice" onClick={(e) => e.stopPropagation()}>
        <div className="mv-panel-header"><h2 className="mv-panel-title">Confirm & Send Invoice</h2></div>
        <p className="mv-subtitle" style={{ marginTop: -8, marginBottom: 16 }}>This is exactly what the customer will see. Sending marks the invoice as delivered.</p>
        <InvoicePreview {...previewProps} />
        <div className="mv-dialog-actions">
          <button className="mv-secondary-button" disabled={sending} onClick={onCancel}>Back</button>
          <button className="mv-primary-button" disabled={sending} onClick={onConfirm}>{sending ? 'Sending…' : 'Send Invoice'}</button>
        </div>
      </section>
    </div>
  );
}
