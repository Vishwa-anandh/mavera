import type { SentEmail } from '../../../shared/domain/billing/billingTypes';
import { formatDate } from '../../../shared/domain/billing/billingDerivations';
import { MailIcon } from '../../../shared/ui/icons';

/**
 * No real mail server exists in this prototype — this shows exactly what
 * was "sent", styled like an inbox preview, with a genuine working link to
 * the public pay page (the only place in the app to follow that link as if
 * you were the customer).
 */
export function SentEmailModal({ email, onClose }: { email: SentEmail; onClose: () => void }) {
  return (
    <div className="mv-dialog-backdrop" onClick={onClose}>
      <section className="mv-dialog" role="dialog" aria-modal="true" aria-label="Invoice sent" onClick={(e) => e.stopPropagation()}>
        <div className="mv-panel-header">
          <h2 className="mv-panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MailIcon size={20} />Invoice Sent</h2>
        </div>
        <p className="mv-muted" style={{ marginTop: -8, marginBottom: 16, fontSize: 12 }}>No real mail server exists in this demo — here's exactly what was "sent."</p>
        <div style={{ border: '1px solid var(--mv-border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', background: 'var(--mv-surface-subtle)', borderBottom: '1px solid var(--mv-border)' }}>
            <p style={{ margin: 0, fontSize: 12 }}><strong>To:</strong> {email.to}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12 }}><strong>Subject:</strong> {email.subject}</p>
            <p className="mv-muted" style={{ margin: '2px 0 0', fontSize: 11 }}>{formatDate(email.sentAt)}</p>
          </div>
          <div style={{ padding: 14, whiteSpace: 'pre-line', fontSize: 13 }}>
            {email.body.split(email.publicUrl).map((chunk, i, arr) => (
              <span key={i}>
                {chunk}
                {i < arr.length - 1 && <a href={email.publicUrl} target="_blank" rel="noopener noreferrer">{email.publicUrl}</a>}
              </span>
            ))}
          </div>
        </div>
        <div className="mv-dialog-actions">
          <button className="mv-primary-button" onClick={onClose}>Done</button>
        </div>
      </section>
    </div>
  );
}
