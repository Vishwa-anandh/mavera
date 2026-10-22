import { flowGuideForPath } from './flowGuides';

/**
 * Tiny window events that let other parts of the app (the command palette) drive the assistant without
 * importing its components: open the chat, or start the guided tour of the page being viewed.
 */
export const OPEN_ASSISTANT_EVENT = 'mavera:assistant-open';
export const START_PAGE_TOUR_EVENT = 'mavera:assistant-page-tour';

export function requestOpenAssistant(): void {
  window.dispatchEvent(new CustomEvent(OPEN_ASSISTANT_EVENT));
}

export function requestPageTour(): void {
  window.dispatchEvent(new CustomEvent(START_PAGE_TOUR_EVENT));
}

/** Does this page have a guided tour to start? */
export function hasPageTour(pathname: string): boolean {
  return (flowGuideForPath(pathname)?.steps.length ?? 0) > 0;
}
