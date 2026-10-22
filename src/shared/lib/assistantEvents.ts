/**
 * Tiny window events that let any part of the app (the command palette, the getting-started card, the profile
 * menu) drive the assistant without importing its components: open the chat, start the guided tour of the page
 * being viewed, start a live coach flow ("connect Azure") or reopen the getting-started checklist.
 * The assistant listens; everyone else only dispatches.
 */
export const OPEN_ASSISTANT_EVENT = 'mavera:assistant-open';
export const START_PAGE_TOUR_EVENT = 'mavera:assistant-page-tour';
export const START_COACH_EVENT = 'mavera:assistant-coach';
export const SHOW_CHECKLIST_EVENT = 'mavera:show-checklist';

export function requestOpenAssistant(): void {
  window.dispatchEvent(new CustomEvent(OPEN_ASSISTANT_EVENT));
}

export function requestPageTour(): void {
  window.dispatchEvent(new CustomEvent(START_PAGE_TOUR_EVENT));
}

/** Starts the live coach for one onboarding flow, e.g. `connect-azure` (see ONBOARDING_FLOWS in the assistant). */
export function requestCoachFlow(flowKey: string): void {
  window.dispatchEvent(new CustomEvent<{ flow: string }>(START_COACH_EVENT, { detail: { flow: flowKey } }));
}

/** Reopens the getting-started checklist on the dashboard (the assistant un-hides it and goes there). */
export function requestShowChecklist(): void {
  window.dispatchEvent(new CustomEvent(SHOW_CHECKLIST_EVENT));
}

/**
 * The coach flow behind each getting-started checklist step (the tour step has none: it starts the page tour).
 * Here, with the events, so the checklist card can start a flow without importing the assistant.
 */
export const CHECKLIST_COACH_FLOWS: Readonly<Record<string, string>> = {
  cloud: 'connect-azure',
  sap: 'connect-sap',
  budget: 'create-budget',
  alerts: 'add-alert-recipients',
  teammate: 'invite-teammate',
};
