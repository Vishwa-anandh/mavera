export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipPlacementResult {
  top: number;
  left: number;
  placement: TooltipPlacement;
  /** Offset of the arrow along the bubble's edge, in px from the bubble's top-left corner. */
  arrow: number;
}

interface Options {
  /** Space between the trigger and the bubble, arrow included. */
  gap?: number;
  /** Minimum distance kept from every viewport edge. */
  pad?: number;
  /** The arrow never sits closer than this to a bubble corner. */
  arrowInset?: number;
  viewport?: { width: number; height: number };
}

const OPPOSITE: Record<TooltipPlacement, TooltipPlacement> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
const PERPENDICULAR: Record<TooltipPlacement, TooltipPlacement[]> = {
  top: ['right', 'left'],
  bottom: ['right', 'left'],
  left: ['bottom', 'top'],
  right: ['bottom', 'top'],
};

/**
 * Anchors a tooltip bubble to a trigger on the preferred side, flips to the opposite side (then the
 * perpendicular ones) when it does not fit, and shifts it along the edge so it never leaves the
 * viewport. Pure so it can be unit tested without a layout engine.
 */
export function computeTooltipPosition(
  anchor: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right' | 'width' | 'height'>,
  size: { width: number; height: number },
  preferred: TooltipPlacement,
  opts: Options = {},
): TooltipPlacementResult {
  const gap = opts.gap ?? 10;
  const pad = opts.pad ?? 8;
  const inset = opts.arrowInset ?? 10;
  const vw = opts.viewport?.width ?? window.innerWidth;
  const vh = opts.viewport?.height ?? window.innerHeight;

  const room: Record<TooltipPlacement, number> = {
    top: anchor.top - pad - gap,
    bottom: vh - pad - anchor.bottom - gap,
    left: anchor.left - pad - gap,
    right: vw - pad - anchor.right - gap,
  };
  const need = (p: TooltipPlacement) => (p === 'top' || p === 'bottom' ? size.height : size.width);
  const candidates = [preferred, OPPOSITE[preferred], ...PERPENDICULAR[preferred]];
  const placement = candidates.find((p) => room[p] >= need(p))
    ?? candidates.reduce((best, p) => (room[p] - need(p) > room[best] - need(best) ? p : best), preferred);

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));
  let top: number;
  let left: number;
  let arrow: number;
  if (placement === 'top' || placement === 'bottom') {
    top = placement === 'top' ? anchor.top - gap - size.height : anchor.bottom + gap;
    left = clamp(anchor.left + anchor.width / 2 - size.width / 2, pad, vw - size.width - pad);
    arrow = clamp(anchor.left + anchor.width / 2 - left, inset, size.width - inset);
  } else {
    left = placement === 'left' ? anchor.left - gap - size.width : anchor.right + gap;
    top = clamp(anchor.top + anchor.height / 2 - size.height / 2, pad, vh - size.height - pad);
    arrow = clamp(anchor.top + anchor.height / 2 - top, inset, size.height - inset);
  }
  // When no side fits at all the bubble is still held inside the viewport.
  top = clamp(top, pad, vh - size.height - pad);
  left = clamp(left, pad, vw - size.width - pad);
  return { top, left, placement, arrow };
}
