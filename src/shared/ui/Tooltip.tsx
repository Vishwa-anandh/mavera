import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { computeFloatingPosition, type FloatingRect } from './floatingPosition';

interface TooltipProps {
  /** Nothing renders (and the trigger gets no listeners) when this is empty. */
  content: ReactNode;
  /** A single focusable or hoverable element — a ref and event handlers are merged onto it. */
  children: ReactElement<Record<string, unknown>>;
}

const OPEN_DELAY = 300;
const CLOSE_DELAY = 100;
const EXIT_DURATION = 120;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function callHandler<E>(handler: unknown, event: E) {
  if (typeof handler === 'function') (handler as (event: E) => void)(event);
}

/**
 * Custom tooltip per MAVERA_DESIGN_SYSTEM.md §10.1: neutral elevated surface,
 * no arrow, 300ms hover-open / immediate focus-open, 100ms close bridge
 * between trigger and bubble, Escape dismisses until the next focus/hover.
 */
export function Tooltip({ content, children }: TooltipProps) {
  const reactId = useId();
  const id = `tooltip-${reactId}`;
  const triggerRef = useRef<HTMLElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const openTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);
  const dismissedRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<FloatingRect | null>(null);

  const clearTimers = () => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
  };

  const open = (immediate: boolean) => {
    if (dismissedRef.current || !content) return;
    clearTimers();
    if (immediate) {
      setMounted(true);
    } else {
      openTimer.current = window.setTimeout(() => setMounted(true), OPEN_DELAY);
    }
  };

  const close = () => {
    clearTimers();
    closeTimer.current = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(() => setMounted(false), prefersReducedMotion() ? 0 : EXIT_DURATION);
    }, CLOSE_DELAY);
  };

  const cancelClose = () => window.clearTimeout(closeTimer.current);

  useEffect(() => clearTimers, []);

  useLayoutEffect(() => {
    if (!mounted) return;
    setVisible(true);
  }, [mounted]);

  useLayoutEffect(() => {
    if (!mounted || !visible || !triggerRef.current) return;
    const update = () => {
      const trigger = triggerRef.current;
      const bubble = bubbleRef.current;
      if (!trigger || !bubble) return;
      setRect(computeFloatingPosition(trigger.getBoundingClientRect(), {
        width: bubble.offsetWidth,
        height: bubble.offsetHeight,
      }, { align: 'center', preferred: 'top' }));
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [mounted, visible]);

  if (!isValidElement(children)) return children;

  const child = children;
  const childProps = child.props as Record<string, unknown>;
  const existingRef = (child as unknown as { ref?: unknown }).ref;

  const triggerProps = {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      if (typeof existingRef === 'function') existingRef(node);
      else if (existingRef && typeof existingRef === 'object') (existingRef as { current: HTMLElement | null }).current = node;
    },
    'aria-describedby': mounted ? id : (childProps['aria-describedby'] as string | undefined),
    onMouseEnter: (e: React.MouseEvent) => { callHandler(childProps.onMouseEnter, e); open(false); },
    onMouseLeave: (e: React.MouseEvent) => { callHandler(childProps.onMouseLeave, e); close(); },
    onFocus: (e: React.FocusEvent) => { callHandler(childProps.onFocus, e); dismissedRef.current = false; open(true); },
    onBlur: (e: React.FocusEvent) => { callHandler(childProps.onBlur, e); close(); },
    onKeyDown: (e: React.KeyboardEvent) => {
      callHandler(childProps.onKeyDown, e);
      if (e.key === 'Escape' && mounted) {
        dismissedRef.current = true;
        clearTimers();
        setVisible(false);
        setMounted(false);
      }
    },
  };

  return (
    <>
      {cloneElement(child, triggerProps)}
      {mounted && content && createPortal(
        <div
          ref={bubbleRef}
          role="tooltip"
          id={id}
          className={`mv-tooltip${visible && rect ? ' is-visible' : ''}`}
          data-placement={rect?.placement ?? 'top'}
          style={{ top: rect?.top ?? 0, left: rect?.left ?? 0 }}
          onMouseEnter={cancelClose}
          onMouseLeave={close}
        >
          {content}
        </div>,
        document.body,
      )}
    </>
  );
}
