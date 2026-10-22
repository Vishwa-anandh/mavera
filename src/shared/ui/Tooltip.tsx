import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { TooltipSurface } from './TooltipSurface';
import type { TooltipPlacement } from './tooltipPosition';
import { TOOLTIP_CLOSE_DELAY, TOOLTIP_OPEN_DELAY, isKeyboardFocus, useTooltipPresence } from './useTooltipPresence';

interface TooltipProps {
  /** Nothing renders (and the trigger gets no behaviour) when this is empty. Use "\n" for a line break. */
  content: ReactNode;
  /** A single element: a ref and event handlers are merged onto it. */
  children: ReactElement<Record<string, unknown>>;
  /** Preferred side; flips and shifts automatically when it does not fit. */
  placement?: TooltipPlacement;
  /** Pointer hover delay in ms. Keyboard focus always opens at once. */
  delay?: number;
}

/** Touch: press and hold this long to see the tooltip. */
export const TOOLTIP_TOUCH_HOLD = 500;
const TOUCH_MOVE_TOLERANCE = 10;
const TOUCH_LINGER = 2000;

function call(handler: unknown, event: unknown) {
  if (typeof handler === 'function') (handler as (e: unknown) => void)(event);
}

function setRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === 'function') ref(node);
  else if (ref && typeof ref === 'object') (ref as { current: T | null }).current = node;
}

function hasContent(content: ReactNode) {
  return content !== null && content !== undefined && content !== false && content !== '';
}

/**
 * Custom tooltip (MAVERA_DESIGN_SYSTEM.md section 10.1). Opens after a 300 ms hover or at once on keyboard
 * focus or a 500 ms touch press-and-hold; closes 100 ms after the pointer leaves (so it can cross to the
 * bubble) and instantly on Escape, blur, scroll or a press elsewhere. Escape stays dismissed until a fresh
 * hover or focus. The trigger gets aria-describedby while it is shown. Deliberate deviation from the design
 * system: a small arrow, requested by the product owner.
 */
export function Tooltip({ content, children, placement = 'top', delay = TOOLTIP_OPEN_DELAY }: TooltipProps) {
  const id = `mv-tooltip-${useId()}`;
  const { phase, show, hide, close, keep } = useTooltipPresence();
  const triggerRef = useRef<HTMLElement | null>(null);
  const dismissedRef = useRef(false);
  const holdTimer = useRef<number | undefined>(undefined);
  const holdStart = useRef<{ x: number; y: number } | null>(null);
  const heldRef = useRef(false);
  const pressedRef = useRef(false);
  const enabled = hasContent(content);
  const active = enabled && phase !== 'closed';

  const open = (wait: number) => {
    if (!enabled || dismissedRef.current) return;
    show(wait);
  };

  const cancelHold = () => {
    window.clearTimeout(holdTimer.current);
    holdStart.current = null;
  };

  useEffect(() => () => window.clearTimeout(holdTimer.current), []);

  // Escape, a scroll outside the bubble, or a press elsewhere dismiss it on the spot.
  useEffect(() => {
    if (!active) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      dismissedRef.current = true;
      close();
    };
    const onScroll = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('[data-tooltip-surface]')) return;
      close();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && (triggerRef.current?.contains(target) || (target instanceof Element && target.closest('[data-tooltip-surface]')))) return;
      close();
    };
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [active, close]);

  if (!isValidElement(children)) return children;
  if (!enabled) return children;

  const child = children as ReactElement<Record<string, unknown>>;
  const props = child.props;
  const describedBy = props['aria-describedby'] as string | undefined;

  const triggerProps: Record<string, unknown> = {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      setRef(props.ref as Ref<HTMLElement> | undefined, node);
    },
    'aria-describedby': active ? [describedBy, id].filter(Boolean).join(' ') : describedBy,
    onPointerEnter: (event: React.PointerEvent) => {
      call(props.onPointerEnter, event);
      if (event.pointerType === 'touch') return;
      dismissedRef.current = false;
      open(delay);
    },
    onPointerLeave: (event: React.PointerEvent) => {
      call(props.onPointerLeave, event);
      if (event.pointerType === 'touch') return;
      dismissedRef.current = false;
      hide(TOOLTIP_CLOSE_DELAY);
    },
    onFocus: (event: React.FocusEvent) => {
      call(props.onFocus, event);
      // Focus that a mouse press caused is not a keyboard visit.
      if (pressedRef.current || !isKeyboardFocus(event.target)) return;
      dismissedRef.current = false;
      open(0);
    },
    onBlur: (event: React.FocusEvent) => {
      call(props.onBlur, event);
      dismissedRef.current = false;
      close();
    },
    onPointerDown: (event: React.PointerEvent) => {
      call(props.onPointerDown, event);
      if (event.pointerType !== 'touch') {
        pressedRef.current = true;
        close();
        return;
      }
      heldRef.current = false;
      holdStart.current = { x: event.clientX, y: event.clientY };
      window.clearTimeout(holdTimer.current);
      holdTimer.current = window.setTimeout(() => {
        heldRef.current = true;
        dismissedRef.current = false;
        open(0);
      }, TOOLTIP_TOUCH_HOLD);
    },
    onPointerMove: (event: React.PointerEvent) => {
      call(props.onPointerMove, event);
      const start = holdStart.current;
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > TOUCH_MOVE_TOLERANCE) cancelHold();
    },
    onPointerUp: (event: React.PointerEvent) => {
      call(props.onPointerUp, event);
      pressedRef.current = false;
      cancelHold();
      if (event.pointerType === 'touch' && heldRef.current) hide(TOUCH_LINGER);
    },
    onPointerCancel: (event: React.PointerEvent) => {
      call(props.onPointerCancel, event);
      pressedRef.current = false;
      cancelHold();
    },
    // A long press must not also open the browser's context menu over the tooltip.
    onContextMenu: (event: React.MouseEvent) => {
      call(props.onContextMenu, event);
      if (heldRef.current) event.preventDefault();
    },
  };

  return (
    <>
      {cloneElement(child, triggerProps as Partial<Record<string, unknown>>)}
      {active && triggerRef.current && (
        <TooltipSurface
          id={id}
          anchor={triggerRef.current}
          placement={placement}
          open={phase === 'open'}
          onPointerEnter={keep}
          onPointerLeave={() => hide(TOOLTIP_CLOSE_DELAY)}
          onAnchorGone={close}
        >
          {content}
        </TooltipSurface>
      )}
    </>
  );
}

export type { TooltipPlacement };
