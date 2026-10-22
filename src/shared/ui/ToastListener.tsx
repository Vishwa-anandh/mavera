import { useEffect, useState } from 'react';
import { subscribeToToasts, type ToastDetail } from '../lib/toastEvents';

/** How long a plain toast stays; one with an action (Undo) stays long enough to be used. */
const TOAST_MS = 4200;
const ACTION_TOAST_MS = 8000;

export function ToastListener() {
  const [toasts, setToasts] = useState<(ToastDetail & { id: number })[]>([]);
  useEffect(() => subscribeToToasts((detail) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { ...detail, id }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), detail.action ? ACTION_TOAST_MS : TOAST_MS);
  }), []);
  const dismiss = (id: number) => setToasts((current) => current.filter((toast) => toast.id !== id));
  return (
    <div className="mv-toast-region" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`mv-toast mv-toast--${toast.type}`}>
          {toast.message}
          {toast.action && (
            <button type="button" className="mv-toast-action" onClick={() => { dismiss(toast.id); toast.action?.onClick(); }}>{toast.action.label}</button>
          )}
        </div>
      ))}
    </div>
  );
}
