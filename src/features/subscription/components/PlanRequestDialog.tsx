import { useId, useState, type FormEvent } from 'react';
import { CloseIcon } from '../../../shared/ui/icons';
import { useModalOverlay } from '../../../shared/ui/useOverlay';
import type { PlanDefinition } from '../model/subscriptionData';

interface PlanRequestDialogProps {
  plan: PlanDefinition;
  currentPlanName: string;
  onSend: (note: string) => void;
  onClose: () => void;
}

/**
 * Asks Maitsys to move the organisation to another plan. Sending only records the request: the plan,
 * modules and seat limits stay as they are until Maitsys changes them in the Super Admin portal.
 */
export function PlanRequestDialog({ plan, currentPlanName, onSend, onClose }: PlanRequestDialogProps) {
  const ref = useModalOverlay<HTMLElement>(onClose);
  const titleId = useId();
  const noteId = useId();
  const [note, setNote] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSend(note);
  };

  return (
    <div className="mv-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={ref} className="mv-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="mv-panel-header">
          <h2 id={titleId} className="mv-panel-title">Request the {plan.name} plan</h2>
          <button type="button" className="mv-icon-button" aria-label="Close" onClick={onClose}><CloseIcon size={16} /></button>
        </div>
        <p>Maitsys will get in touch about moving from {currentPlanName} to {plan.name}. Pricing is shared in that conversation.</p>
        <p className="mv-muted">Sending this does not change your plan, modules or team size. Maitsys makes those changes once you have agreed.</p>
        <form onSubmit={submit}>
          <div className="mv-field">
            <label htmlFor={noteId}>Anything Maitsys should know? <span className="mv-muted">(optional)</span></label>
            <textarea id={noteId} rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="For example: we need GCP and SAP BTP monitoring from next month." data-autofocus />
          </div>
          <div className="mv-dialog-actions">
            <button type="button" className="mv-secondary-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="mv-primary-button">Send request</button>
          </div>
        </form>
      </section>
    </div>
  );
}
