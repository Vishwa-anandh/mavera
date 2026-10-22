import { describe, expect, it } from 'vitest';
import { computeTooltipPosition } from './tooltipPosition';

const viewport = { width: 1000, height: 800 };
const rect = (left: number, top: number, width = 40, height = 40) => ({ left, top, width, height, right: left + width, bottom: top + height });
const bubble = { width: 200, height: 40 };

describe('computeTooltipPosition', () => {
  it('sits above the trigger, centred, when there is room', () => {
    const result = computeTooltipPosition(rect(480, 400), bubble, 'top', { viewport });
    expect(result.placement).toBe('top');
    expect(result.left).toBe(400);
    expect(result.top).toBe(400 - 10 - 40);
    expect(result.arrow).toBe(100);
  });

  it('flips below when there is no room above, and above when there is no room below', () => {
    expect(computeTooltipPosition(rect(480, 10), bubble, 'top', { viewport }).placement).toBe('bottom');
    expect(computeTooltipPosition(rect(480, 750), bubble, 'bottom', { viewport }).placement).toBe('top');
  });

  it('flips sideways placements across the trigger', () => {
    expect(computeTooltipPosition(rect(10, 400), bubble, 'left', { viewport }).placement).toBe('right');
    expect(computeTooltipPosition(rect(950, 400), bubble, 'right', { viewport }).placement).toBe('left');
  });

  it('shifts along the edge so it never leaves the viewport, keeping the arrow on the trigger', () => {
    const nearRight = computeTooltipPosition(rect(960, 400), bubble, 'top', { viewport });
    expect(nearRight.left + bubble.width).toBeLessThanOrEqual(viewport.width - 8);
    expect(nearRight.arrow).toBe(960 + 20 - nearRight.left);
    const nearLeft = computeTooltipPosition(rect(0, 400), bubble, 'top', { viewport });
    expect(nearLeft.left).toBe(8);
    expect(nearLeft.arrow).toBe(12);
  });

  it('falls back to a perpendicular side, then clamps, when neither vertical side fits', () => {
    const tall = { width: 200, height: 780 };
    const result = computeTooltipPosition(rect(480, 380), tall, 'top', { viewport });
    expect(['left', 'right']).toContain(result.placement);
    expect(result.top).toBeGreaterThanOrEqual(8);
    expect(result.top + tall.height).toBeLessThanOrEqual(viewport.height - 8);
  });
});
