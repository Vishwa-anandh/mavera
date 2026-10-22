import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Behaviour every modal surface in the shell shares (search, notifications, mobile menu):
 * Escape closes it, Tab stays inside it, the page behind doesn't scroll, focus moves in on
 * open (to `[data-autofocus]` or the first focusable element) and returns to whatever opened
 * it on close.
 *
 * `modal: false` keeps the ref but none of the behaviour: a floating card that must leave the page (and any
 * dialog on it) usable, such as the live coach, still gets a stable ref without taking focus or scroll.
 */
export function useModalOverlay<T extends HTMLElement>(onClose: () => void, { modal = true }: { modal?: boolean } = {}): RefObject<T | null> {
  const containerRef = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!modal) return;
    const container = containerRef.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const initial = container?.querySelector<HTMLElement>('[data-autofocus]') ?? container?.querySelector<HTMLElement>(FOCUSABLE);
    initial?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !container) return;
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [modal]);

  return containerRef;
}

/**
 * For non-modal popups (module dropdowns, apps and profile menus): a pointer press outside
 * `rootRef` or Escape anywhere closes it. Escape returns focus to the trigger.
 */
export function useDismiss(open: boolean, rootRef: RefObject<HTMLElement | null>, close: (restoreFocus: boolean) => void) {
  const closeRef = useRef(close);
  useEffect(() => { closeRef.current = close; }, [close]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) closeRef.current(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current(true);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, rootRef]);
}

/** Arrow/Home/End movement between `[role^="menuitem"]` rows, per WAI-ARIA menu semantics. */
export function handleMenuKeys(event: ReactKeyboardEvent<HTMLElement>) {
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role^="menuitem"]'));
  if (items.length === 0) return;
  const current = items.indexOf(document.activeElement as HTMLElement);
  const focusAt = (index: number) => items[(index + items.length) % items.length]?.focus();
  if (event.key === 'ArrowDown') { event.preventDefault(); focusAt(current + 1); }
  else if (event.key === 'ArrowUp') { event.preventDefault(); focusAt(current < 0 ? -1 : current - 1); }
  else if (event.key === 'Home') { event.preventDefault(); focusAt(0); }
  else if (event.key === 'End') { event.preventDefault(); focusAt(-1); }
}
