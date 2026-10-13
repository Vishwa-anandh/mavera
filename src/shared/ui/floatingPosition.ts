export interface FloatingRect {
  top: number;
  left: number;
  placement: 'top' | 'bottom';
}

interface FloatingOptions {
  gap?: number;
  viewportPadding?: number;
  align?: 'center' | 'start';
  preferred?: 'top' | 'bottom';
}

/**
 * Shared placement math for Tooltip and Select popups: anchor a floating
 * panel above/below a trigger, flipping when the preferred side doesn't fit
 * and clamping so it never renders outside the viewport.
 */
export function computeFloatingPosition(
  anchor: DOMRect,
  floatingSize: { width: number; height: number },
  opts: FloatingOptions = {},
): FloatingRect {
  const gap = opts.gap ?? 8;
  const pad = opts.viewportPadding ?? 8;
  const preferred = opts.preferred ?? 'top';
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  let placement = preferred;
  let top: number;
  if (preferred === 'top') {
    top = anchor.top - floatingSize.height - gap;
    if (top < pad) { placement = 'bottom'; top = anchor.bottom + gap; }
  } else {
    top = anchor.bottom + gap;
    if (top + floatingSize.height > vh - pad) { placement = 'top'; top = anchor.top - floatingSize.height - gap; }
  }
  top = Math.min(Math.max(top, pad), Math.max(pad, vh - floatingSize.height - pad));

  let left = opts.align === 'start'
    ? anchor.left
    : anchor.left + anchor.width / 2 - floatingSize.width / 2;
  left = Math.min(Math.max(left, pad), Math.max(pad, vw - floatingSize.width - pad));

  return { top, left, placement };
}
