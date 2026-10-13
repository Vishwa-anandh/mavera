import { describe, it, expect, vi } from 'vitest';
import { fireToast, subscribeToToasts, CCM_TOAST_EVENT } from './toastEvents';

describe('toastEvents', () => {
  it('fireToast dispatches a window CustomEvent with the given detail', () => {
    const handler = vi.fn();
    window.addEventListener(CCM_TOAST_EVENT, handler as EventListener);
    fireToast({ type: 'error', message: 'Something broke' });
    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ type: 'error', message: 'Something broke' });
    window.removeEventListener(CCM_TOAST_EVENT, handler as EventListener);
  });

  it('subscribeToToasts invokes the callback for dispatched toasts and unsubscribes cleanly', () => {
    const callback = vi.fn();
    const unsubscribe = subscribeToToasts(callback);
    fireToast({ type: 'success', message: 'Saved' });
    expect(callback).toHaveBeenCalledWith({ type: 'success', message: 'Saved' });
    unsubscribe();
    fireToast({ type: 'success', message: 'Saved again' });
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
