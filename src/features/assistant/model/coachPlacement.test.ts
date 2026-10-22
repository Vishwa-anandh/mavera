import { describe, it, expect } from 'vitest';
import { placeCoachCard, sameBox } from './coachPlacement';

const CARD = { width: 336, height: 240 };
const WIDE = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

describe('placeCoachCard', () => {
  it('centres the card when there is nothing to point at', () => {
    expect(placeCoachCard(null, CARD, WIDE)).toEqual({ top: 330, left: 552 });
  });

  it('puts the card beside the element, to the right, lined up with it', () => {
    const spot = { top: 400, left: 100, width: 300, height: 44 };
    expect(placeCoachCard(spot, CARD, WIDE)).toEqual({ top: 392, left: 416 });
  });

  it('stays clear of the whole dialog the element is in, not just the element', () => {
    const spot = { top: 280, left: 800, width: 160, height: 36 };
    const dialog = { top: 180, left: 373, width: 684, height: 540 };
    const placed = placeCoachCard(spot, CARD, WIDE, dialog);
    expect(placed.left).toBe(373 + 684 + 16);
    expect(placed.left + CARD.width).toBeLessThanOrEqual(WIDE.width - 16);
  });

  it('falls back to the left side when the right has no room', () => {
    const spot = { top: 300, left: 1100, width: 200, height: 40 };
    expect(placeCoachCard(spot, CARD, WIDE).left).toBe(1100 - 16 - CARD.width);
  });

  it('on a phone goes below an element in the top half and above one in the bottom half, never over it', () => {
    const high = { top: 200, left: 20, width: 350, height: 44 };
    const below = placeCoachCard(high, CARD, PHONE);
    expect(below.top).toBeGreaterThanOrEqual(high.top + high.height);
    const low = { top: 640, left: 20, width: 350, height: 44 };
    const above = placeCoachCard(low, CARD, PHONE);
    expect(above.top + CARD.height).toBeLessThanOrEqual(low.top);
  });

  it('never leaves the screen', () => {
    const edge = { top: 880, left: 1400, width: 30, height: 20 };
    const placed = placeCoachCard(edge, CARD, WIDE);
    expect(placed.top).toBeGreaterThanOrEqual(16);
    expect(placed.top + CARD.height).toBeLessThanOrEqual(WIDE.height - 16);
    expect(placed.left).toBeGreaterThanOrEqual(16);
  });
});

describe('sameBox', () => {
  it('compares boxes by value, and null with null', () => {
    expect(sameBox(null, null)).toBe(true);
    expect(sameBox({ top: 1, left: 2, width: 3, height: 4 }, { top: 1, left: 2, width: 3, height: 4 })).toBe(true);
    expect(sameBox({ top: 1, left: 2, width: 3, height: 4 }, { top: 1, left: 2, width: 3, height: 5 })).toBe(false);
    expect(sameBox({ top: 1, left: 2, width: 3, height: 4 }, null)).toBe(false);
  });
});
