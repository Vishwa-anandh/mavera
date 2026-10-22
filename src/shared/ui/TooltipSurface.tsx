import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { computeTooltipPosition, type TooltipPlacement, type TooltipPlacementResult } from './tooltipPosition';

interface TooltipSurfaceProps {
  id: string;
  anchor: HTMLElement;
  placement: TooltipPlacement;
  /** False while the exit fade runs. */
  open: boolean;
  children: ReactNode;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  /** The trigger left the document while the tooltip was open. */
  onAnchorGone?: () => void;
}

/**
 * The tooltip bubble: portalled to the body with fixed positioning (so it can neither be clipped by a
 * table cell or scroll container nor add scroll), measured after mount, flipped and shifted to stay
 * inside the viewport, with an arrow pointing at the trigger. Shared by Tooltip and TooltipProvider.
 */
export function TooltipSurface({ id, anchor, placement, open, children, onPointerEnter, onPointerLeave, onAnchorGone }: TooltipSurfaceProps) {
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<TooltipPlacementResult | null>(null);
  const [shown, setShown] = useState(false);

  useLayoutEffect(() => {
    const place = () => {
      const bubble = bubbleRef.current;
      if (!bubble) return;
      setPosition(computeTooltipPosition(anchor.getBoundingClientRect(), { width: bubble.offsetWidth, height: bubble.offsetHeight }, placement));
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [anchor, placement, children]);

  // One frame at opacity 0 so the fade-in actually transitions.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setShown(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!onAnchorGone) return undefined;
    const timer = window.setInterval(() => { if (!anchor.isConnected) onAnchorGone(); }, 400);
    return () => window.clearInterval(timer);
  }, [anchor, onAnchorGone]);

  const vertical = (position?.placement ?? placement) === 'top' || (position?.placement ?? placement) === 'bottom';
  const style = {
    top: position?.top ?? 0,
    left: position?.left ?? 0,
    '--mv-tip-arrow': `${position?.arrow ?? 0}px`,
  } as CSSProperties;

  return createPortal(
    <div
      ref={bubbleRef}
      role="tooltip"
      id={id}
      data-tooltip-surface=""
      data-placement={position?.placement ?? placement}
      data-axis={vertical ? 'x' : 'y'}
      className={`mv-tooltip${open && shown && position ? ' is-visible' : ''}`}
      style={style}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}
