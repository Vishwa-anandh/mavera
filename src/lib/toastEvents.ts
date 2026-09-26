export type ToastType = 'error' | 'warning' | 'success' | 'info';

export interface ToastDetail {
  type: ToastType;
  message: string;
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
