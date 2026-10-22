import type { WorkspaceProgressSignals } from '../../../data-access';
import type { TourStep, TourWait } from './flowGuides';

/** Everything a wait needs to know about the app right now. */
export interface CoachContext {
  pathname: string;
  /** The counts as they were when the coach flow began; a `change` wait compares against them. */
  baseline: WorkspaceProgressSignals;
  /** The counts now. */
  signals: WorkspaceProgressSignals;
}

export function waitsOf(step: TourStep): TourWait[] {
  if (!step.waitFor) return [];
  return Array.isArray(step.waitFor) ? step.waitFor : [step.waitFor];
}

/** A step is part of a live coach flow when it asks the person to do something or moves them somewhere. */
export function isCoachStep(step: TourStep): boolean {
  return Boolean(step.waitFor || step.action || step.enter || step.optional);
}

/** Does a tour contain coach steps? Such a tour never drops steps whose element is not on the page yet. */
export function isCoachFlow(steps: TourStep[]): boolean {
  return steps.some(isCoachStep);
}

/**
 * Is a wait satisfied? A click cannot be seen from here (it is an event, not a state): the tour listens for
 * it and treats it as met on its own, so `click` always answers false.
 */
export function isWaitMet(wait: TourWait, ctx: CoachContext): boolean {
  switch (wait.kind) {
    case 'element': return document.querySelector(wait.selector) !== null;
    case 'gone': return document.querySelector(wait.selector) === null;
    case 'field': {
      const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(wait.selector);
      return Boolean(el && el.value.trim() !== '');
    }
    case 'change': return ctx.signals[wait.signal] !== ctx.baseline[wait.signal];
    case 'route': return ctx.pathname.startsWith(wait.startsWith);
    case 'click': return false;
  }
}

/** True when any one of the step's waits is met by state alone. */
export function isStepDone(step: TourStep, ctx: CoachContext): boolean {
  return waitsOf(step).some((wait) => isWaitMet(wait, ctx));
}

/** Does the step wait for a click on its own target? */
export function waitsForClick(step: TourStep): boolean {
  return waitsOf(step).some((wait) => wait.kind === 'click');
}

/**
 * Types an example into each EMPTY field the way a person would, so the page's own form state sees it: React listens
 * to the input event, not to the value property. Fields are filled one after another with a turn of the event
 * loop between them, so a form that keeps all its fields in one state object has re-rendered before the next
 * field is set (otherwise the second field would overwrite the first with a stale copy). Resolves with how many
 * fields were filled.
 */
export async function fillFields(fields: Array<{ selector: string; value: string }>): Promise<number> {
  let filled = 0;
  for (const { selector, value } of fields) {
    const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
    if (!el || el.value.trim() !== '') continue; // never overwrite what the person (or a default) already put there
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    filled += 1;
    await new Promise<void>((resolve) => { window.setTimeout(resolve, 0); });
  }
  return filled;
}
