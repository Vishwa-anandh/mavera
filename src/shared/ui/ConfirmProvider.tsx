import { createContext, useContext, useId, useMemo, useState, type ReactNode } from 'react';
import { useModalOverlay } from './useOverlay';

export type ConfirmVariant = 'delete' | 'logout' | 'warning' | 'danger';
export interface ConfirmOptions { title: string; description?: string; variant?: ConfirmVariant; okText?: string; cancelText?: string; }
type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

/**
 * The confirmation dialog: a modal alert dialog. Escape cancels, Tab stays inside it, focus starts on Cancel (the
 * safe choice for a destructive question) and returns to the control that asked when it closes.
 */
function ConfirmDialog({ options, onResult }: { options: ConfirmOptions; onResult: (value: boolean) => void }) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useModalOverlay<HTMLElement>(() => onResult(false));
  return (
    <div className="mv-dialog-backdrop" role="presentation">
      <section ref={dialogRef} className="mv-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={options.description ? descriptionId : undefined}>
        <p className="mv-eyebrow">Confirmation</p>
        <h2 id={titleId} className="mv-panel-title">{options.title}</h2>
        {options.description && <p id={descriptionId} className="mv-subtitle">{options.description}</p>}
        <div className="mv-dialog-actions">
          <button type="button" className="mv-secondary-button" onClick={() => onResult(false)}>{options.cancelText ?? 'Cancel'}</button>
          <button type="button" className="mv-primary-button" onClick={() => onResult(true)}>{options.okText ?? 'Confirm'}</button>
        </div>
      </section>
    </div>
  );
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<{ options: ConfirmOptions; resolve: (value: boolean) => void } | null>(null);
  const confirm = useMemo<ConfirmFn>(() => (options) => new Promise<boolean>((resolve) => setPending({ options, resolve })), []);
  const close = (result: boolean) => { pending?.resolve(result); setPending(null); };
  return <ConfirmContext.Provider value={confirm}>{children}{pending && <ConfirmDialog options={pending.options} onResult={close} />}</ConfirmContext.Provider>;
}
export function useConfirm(): ConfirmFn { const ctx = useContext(ConfirmContext); if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider'); return ctx; }
