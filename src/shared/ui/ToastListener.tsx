import { useEffect, useState } from 'react';
import { subscribeToToasts, type ToastDetail } from '../lib/toastEvents';
export function ToastListener() {
  const [toasts, setToasts] = useState<(ToastDetail & { id: number })[]>([]);
  useEffect(() => subscribeToToasts((detail) => { const id = Date.now(); setToasts((current) => [...current, { ...detail, id }]); window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4200); }), []);
  return <div className="mv-toast-region" aria-live="polite">{toasts.map((toast) => <div key={toast.id} className={`mv-toast mv-toast--${toast.type}`}>{toast.message}</div>)}</div>;
}
