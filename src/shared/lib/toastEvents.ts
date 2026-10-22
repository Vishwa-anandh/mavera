export type ToastType = 'error' | 'warning' | 'success' | 'info';

export interface ToastAction {
  /** Short verb for the button, e.g. "Undo". */
  label: string;
  /** Runs once when the button is pressed; the toast then closes. */
  onClick: () => void;
}

export interface ToastDetail {
  type: ToastType;
  message: string;
  /** An action offered inside the toast (Undo after a delete). A toast with an action stays a little longer. */
  action?: ToastAction;
}

export const CCM_TOAST_EVENT = 'ccm:toast';

export function fireToast(detail: ToastDetail): void {
  window.dispatchEvent(new CustomEvent<ToastDetail>(CCM_TOAST_EVENT, { detail }));
}

export function subscribeToToasts(callback: (detail: ToastDetail) => void): () => void {
  const handler = (event: Event) => {
    callback((event as CustomEvent<ToastDetail>).detail);
  };
  window.addEventListener(CCM_TOAST_EVENT, handler);
  return () => window.removeEventListener(CCM_TOAST_EVENT, handler);
}
