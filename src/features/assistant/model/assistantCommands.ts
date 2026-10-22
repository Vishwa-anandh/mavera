import { flowGuideForPath } from './flowGuides';

/**
 * The window events that let other parts of the app (the command palette, the getting-started card) drive the
 * assistant live in shared/lib/assistantEvents so features need not import each other; they are re-exported here
 * because the assistant is their owner.
 */
export {
  OPEN_ASSISTANT_EVENT, SHOW_CHECKLIST_EVENT, START_COACH_EVENT, START_PAGE_TOUR_EVENT,
  requestCoachFlow, requestOpenAssistant, requestPageTour, requestShowChecklist,
} from '../../../shared/lib/assistantEvents';

/** Does this page have a guided tour to start? */
export function hasPageTour(pathname: string): boolean {
  return (flowGuideForPath(pathname)?.steps.length ?? 0) > 0;
}
