import { computeFloatingPosition } from '../../../shared/ui/floatingPosition';

export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const right = (b: Box) => b.left + b.width;

/**
 * Where the coach card goes. It must not cover what the person is asked to use, so it prefers the space
 * BESIDE the element (or beside the dialog the element is in): the right, then the left. When the screen is
 * too narrow for that it goes above or below the element, whichever side the element is not on, so a field in
 * the lower half of a phone screen gets the card above it. With nothing to point at it is centred.
 */
export function placeCoachCard(
  spot: Box | null,
  card: { width: number; height: number },
  viewport: { width: number; height: number },
  avoid: Box | null = null,
  gap = 16,
): { top: number; left: number } {
  if (!spot) return { top: Math.max(gap, (viewport.height - card.height) / 2), left: Math.max(gap, (viewport.width - card.width) / 2) };

  const around = avoid ?? spot;
  const clampTop = (value: number) => Math.min(Math.max(value, gap), Math.max(gap, viewport.height - card.height - gap));
  // Line the card up with the element, but keep it on screen.
  const top = clampTop(spot.top - 8);

  if (right(around) + gap + card.width <= viewport.width - gap) return { top, left: right(around) + gap };
  if (around.left - gap - card.width >= gap) return { top, left: around.left - gap - card.width };

  const anchor = new DOMRect(spot.left, spot.top, spot.width, spot.height);
  const lowerHalf = spot.top + spot.height / 2 > viewport.height / 2;
  const placed = computeFloatingPosition(anchor, card, { preferred: lowerHalf ? 'top' : 'bottom', align: 'start', gap, viewportPadding: gap });
  return { top: placed.top, left: placed.left };
}

export const boxOf = (rect: DOMRect): Box => ({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
export const sameBox = (a: Box | null, b: Box | null): boolean =>
  a === b || (a !== null && b !== null && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height);
