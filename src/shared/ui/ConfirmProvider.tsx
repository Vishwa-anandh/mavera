import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type ConfirmVariant = 'delete' | 'logout' | 'warning' | 'danger';
export interface ConfirmOptions { title: string; description?: string; variant?: ConfirmVariant; okText?: string; cancelText?: string; }
type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<{ options: ConfirmOptions; resolve: (value: boolean) => void } | null>(null);
  const confirm = useMemo<ConfirmFn>(() => (options) => new Promise<boolean>((resolve) => setPending({ options, resolve })), []);
  const close = (result: boolean) => { pending?.resolve(result); setPending(null); };
  return <ConfirmContext.Provider value={confirm}>{children}{pending && <div className="mv-dialog-backdrop" role="presentation"><section className="mv-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"><p className="mv-eyebrow">Confirmation</p><h2 id="confirm-title" className="mv-panel-title">{pending.options.title}</h2>{pending.options.description && <p className="mv-subtitle">{pending.options.description}</p>}<div className="mv-dialog-actions"><button className="mv-secondary-button" onClick={() => close(false)}>{pending.options.cancelText ?? 'Cancel'}</button><button className="mv-primary-button" onClick={() => close(true)}>{pending.options.okText ?? 'Confirm'}</button></div></section></div>}</ConfirmContext.Provider>;
}
export function useConfirm(): ConfirmFn { const ctx = useContext(ConfirmContext); if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider'); return ctx; }
