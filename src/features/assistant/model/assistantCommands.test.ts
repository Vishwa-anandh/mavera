import { describe, it, expect, vi } from 'vitest';
import { hasPageTour, OPEN_ASSISTANT_EVENT, requestOpenAssistant, requestPageTour, START_PAGE_TOUR_EVENT } from './assistantCommands';

describe('assistant commands', () => {
  it('announces open and tour requests as window events', () => {
    const onOpen = vi.fn();
    const onTour = vi.fn();
    window.addEventListener(OPEN_ASSISTANT_EVENT, onOpen);
    window.addEventListener(START_PAGE_TOUR_EVENT, onTour);
    requestOpenAssistant();
    requestPageTour();
    window.removeEventListener(OPEN_ASSISTANT_EVENT, onOpen);
    window.removeEventListener(START_PAGE_TOUR_EVENT, onTour);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onTour).toHaveBeenCalledTimes(1);
  });

  it('knows which pages have a tour', () => {
    expect(hasPageTour('/budgets')).toBe(true);
    expect(hasPageTour('/no-such-page')).toBe(false);
  });
});
