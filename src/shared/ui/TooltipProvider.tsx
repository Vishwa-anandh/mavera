import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { TooltipSurface } from './TooltipSurface';
import type { TooltipPlacement } from './tooltipPosition';
import { TOOLTIP_CLOSE_DELAY, TOOLTIP_OPEN_DELAY, isKeyboardFocus, useTooltipPresence } from './useTooltipPresence';

const TOUCH_HOLD = 500;
const TOUCH_MOVE_TOLERANCE = 10;
const TOUCH_LINGER = 2000;
/** Elements whose title is their accessible name or part of their behaviour: left as they are. */
const SKIP_TAGS = new Set(['IFRAME', 'FRAME', 'OBJECT', 'EMBED']);
const NAMED_CONTROLS = 'button, a[href], [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="switch"], [role="checkbox"]';
const PLACEMENTS: TooltipPlacement[] = ['top', 'bottom', 'left', 'right'];

interface Target {
  element: HTMLElement;
  text: string;
  placement: TooltipPlacement;
}

function hasAccessibleName(element: HTMLElement) {
  if (element.getAttribute('aria-label')?.trim() || element.getAttribute('aria-labelledby')) return true;
  if ((element.textContent ?? '').trim()) return true;
  return !!element.querySelector('img[alt]:not([alt=""]), [aria-label]');
}

/**
 * Takes over an element's native title: the text moves to data-tooltip (so the browser never draws its own
 * slow, unstyled tooltip), and an icon-only control keeps an accessible name by getting aria-label from it.
 * Returns the tooltip text, or null when the element has nothing to show or opted out.
 */
function adoptTitle(element: HTMLElement): string | null {
  if (element.closest('[data-no-tooltip]') || SKIP_TAGS.has(element.tagName)) return null;
  const title = element.getAttribute('title');
  if (title !== null) {
    if (!title.trim()) return element.getAttribute('data-tooltip');
    element.removeAttribute('title');
    element.setAttribute('data-tooltip', title);
    if (element.matches(NAMED_CONTROLS) && !hasAccessibleName(element)) element.setAttribute('aria-label', title);
  }
  const text = element.getAttribute('data-tooltip');
  return text && text.trim() ? text : null;
}

function findTarget(node: EventTarget | null): Target | null {
  if (!(node instanceof Element)) return null;
  const element = node.closest<HTMLElement>('[title], [data-tooltip]');
  if (!element) return null;
  const text = adoptTitle(element);
  if (!text) return null;
  const wanted = element.getAttribute('data-tooltip-placement') as TooltipPlacement | null;
  return { element, text, placement: wanted && PLACEMENTS.includes(wanted) ? wanted : 'top' };
}

const insideSurface = (node: EventTarget | null) => node instanceof Element && !!node.closest('[data-tooltip-surface]');

/**
 * Upgrades every native title attribute in the app to the custom tooltip, by delegation, so no feature has to
 * change: hover (300 ms) or keyboard focus (at once) on an element, or a descendant of one, with a title shows
 * the shared tooltip; touch needs a 500 ms press-and-hold. Mounted once in the app shells. An element or
 * ancestor with data-no-tooltip keeps its native title; data-tooltip-placement picks a side. Renders nothing
 * until a tooltip is open.
 */
export function TooltipProvider() {
  const id = `mv-tooltip-${useId()}`;
  const { phase, show, hide, close, keep } = useTooltipPresence();
  const [target, setTarget] = useState<Target | null>(null);
  const targetRef = useRef<Target | null>(null);
  const dismissedRef = useRef<HTMLElement | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const present = useCallback((next: Target, wait: number) => {
    if (dismissedRef.current === next.element) return;
    if (targetRef.current?.element === next.element) {
      // Still on the same trigger: a showing tooltip stays; one waiting to open is not restarted.
      if (phaseRef.current !== 'closed') keep();
      else if (wait === 0) show(0);
      return;
    }
    targetRef.current = next;
    setTarget(next);
    // Moving between triggers while one is showing swaps at once instead of re-waiting.
    show(phaseRef.current === 'open' ? 0 : wait);
  }, [show, keep]);

  useEffect(() => {
    let holdTimer: number | undefined;
    let holdStart: { x: number; y: number } | null = null;
    let holdFired = false;
    let pressing = false;
    const cancelHold = () => {
      window.clearTimeout(holdTimer);
      holdStart = null;
    };

    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      if (insideSurface(event.target)) {
        keep();
        return;
      }
      const next = findTarget(event.target);
      if (!next) {
        dismissedRef.current = null;
        if (targetRef.current) hide(TOOLTIP_CLOSE_DELAY);
        return;
      }
      if (dismissedRef.current && dismissedRef.current !== next.element) dismissedRef.current = null;
      present(next, TOOLTIP_OPEN_DELAY);
    };
    const onPointerOut = (event: PointerEvent) => {
      // Leaving the window altogether produces no pointerover elsewhere.
      if (event.pointerType !== 'touch' && !event.relatedTarget && targetRef.current) hide(TOOLTIP_CLOSE_DELAY);
    };
    const onFocusIn = (event: FocusEvent) => {
      const next = findTarget(event.target);
      // Focus that a mouse press caused is not a keyboard visit.
      if (!next || pressing || !isKeyboardFocus(event.target)) return;
      if (dismissedRef.current !== next.element) dismissedRef.current = null;
      present(next, 0);
    };
    const onFocusOut = (event: FocusEvent) => {
      if (event.target === dismissedRef.current) dismissedRef.current = null;
      const current = targetRef.current;
      if (current && event.target instanceof Node && current.element.contains(event.target)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || phaseRef.current === 'closed') return;
      dismissedRef.current = targetRef.current?.element ?? null;
      close();
    };
    const onScroll = (event: Event) => {
      if (phaseRef.current !== 'closed' && !insideSurface(event.target)) close();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (insideSurface(event.target)) return;
      pressing = event.pointerType !== 'touch';
      close();
      const next = findTarget(event.target);
      if (event.pointerType !== 'touch') {
        // A click answers the question: stay quiet until the pointer leaves this trigger.
        dismissedRef.current = next?.element ?? null;
        return;
      }
      holdFired = false;
      if (!next) return;
      holdStart = { x: event.clientX, y: event.clientY };
      holdTimer = window.setTimeout(() => {
        holdFired = true;
        dismissedRef.current = null;
        present(next, 0);
      }, TOUCH_HOLD);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch' && holdStart && Math.hypot(event.clientX - holdStart.x, event.clientY - holdStart.y) > TOUCH_MOVE_TOLERANCE) cancelHold();
    };
    const onPointerEnd = (event: PointerEvent) => {
      pressing = false;
      cancelHold();
      if (event.pointerType === 'touch' && holdFired) hide(TOUCH_LINGER);
    };
    // A long press must not also open the browser's context menu over the tooltip.
    const onContextMenu = (event: Event) => {
      if (holdFired) {
        event.preventDefault();
        holdFired = false;
      }
    };

    document.addEventListener('pointerover', onPointerOver);
    document.addEventListener('pointerout', onPointerOut);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerEnd);
    document.addEventListener('pointercancel', onPointerEnd);
    document.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      cancelHold();
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('pointerout', onPointerOut);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerEnd);
      document.removeEventListener('pointercancel', onPointerEnd);
      document.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [present, hide, close, keep]);

  // The trigger is described by the bubble only while it is on screen.
  const element = target?.element ?? null;
  const showing = phase !== 'closed';
  useEffect(() => {
    if (!element || !showing) return undefined;
    const previous = element.getAttribute('aria-describedby');
    element.setAttribute('aria-describedby', [previous, id].filter(Boolean).join(' '));
    return () => {
      if (previous) element.setAttribute('aria-describedby', previous);
      else element.removeAttribute('aria-describedby');
    };
  }, [element, showing, id]);

  useEffect(() => {
    if (phase === 'closed') targetRef.current = null;
  }, [phase]);

  if (!target || phase === 'closed') return null;
  return (
    <TooltipSurface
      id={id}
      anchor={target.element}
      placement={target.placement}
      open={phase === 'open'}
      onPointerEnter={keep}
      onPointerLeave={() => hide(TOOLTIP_CLOSE_DELAY)}
      onAnchorGone={close}
    >
      {target.text}
    </TooltipSurface>
  );
}
