import { isEmptyWorkspace, workspaceRepository } from '../../../data-access';
import { onboardingProgressOf } from '../../workspace';
import { flowForChecklistStep, onboardingFlowByKey, type OnboardingFlow } from './onboardingFlows';

export interface SetupModules {
  cloudCost: boolean;
  sapMonitoring: boolean;
}

/** What a setup question asks the assistant to do. */
export type SetupIntent =
  /** Start the live coach for one flow ("Help me connect Azure"). */
  | { kind: 'coach'; flow: OnboardingFlow }
  /** Show the getting-started checklist. */
  | { kind: 'checklist' }
  /** "Set me up": show the checklist and coach the first unfinished step. */
  | { kind: 'setup' };

const CONNECT = /\b(connect|add|link|integrate|hook up|set ?up|onboard)\b/;

/** The flow a "connect ..." sentence is about, or undefined when it names no provider. */
function connectFlowFor(text: string): OnboardingFlow | undefined {
  if (!CONNECT.test(text)) return undefined;
  if (/\b(btp|business technology platform)\b/.test(text)) return onboardingFlowByKey('connect-btp');
  if (/\bazure\b/.test(text)) return onboardingFlowByKey('connect-azure');
  if (/\baws\b|\bamazon web services\b/.test(text)) return onboardingFlowByKey('connect-aws');
  if (/\bgcp\b|\bgoogle cloud\b/.test(text)) return onboardingFlowByKey('connect-gcp');
  if (/\bsap\b.*\b(system|landscape|destination|server|instance)s?\b|\bconnect\b.*\bsap\b|\b(system|landscape|destination)s?\b.*\bsap\b/.test(text)) return onboardingFlowByKey('connect-sap');
  if (/\bconnect\b.*\b(cloud|account|subscription)\b/.test(text)) return onboardingFlowByKey('connect-azure');
  return undefined;
}

/**
 * Reads a chip or a typed sentence as a setup request: "Help me connect Azure", "Set me up", "Show my
 * checklist", "create a budget", "add alert recipients", "invite a teammate". Returns null for anything else.
 */
export function setupIntentFor(question: string): SetupIntent | null {
  const text = question.toLowerCase().trim();
  if (!text) return null;

  if (/\b(show|open|see|where('s| is))\b.*\b(checklist|getting started|setup list)\b|^(my |the )?(setup )?checklist\??$/.test(text)) return { kind: 'checklist' };
  if (/\b(set me up|get me started|set up my (workspace|account|organi[sz]ation)|onboard me|start (the|my) (checklist|setup)|what should i do first)\b|^getting started$/.test(text)) return { kind: 'setup' };

  const connect = connectFlowFor(text);
  if (connect) return { kind: 'coach', flow: connect };

  const flow = (key: string) => ({ kind: 'coach', flow: onboardingFlowByKey(key)! }) as SetupIntent;
  if (/\b(create|add|make|new|set up|set)\b.*\bbudget\b/.test(text)) return flow('create-budget');
  if (/\balert recipients?\b|\b(add|set up)\b.*\b(alert|notification)s?\b.*\b(recipients?|emails?|channels?)\b|\bwho (gets|receives) (the )?alerts?\b/.test(text)) return flow('add-alert-recipients');
  if (/\b(invite|add)\b.*\b(teammate|team ?mate|colleague|co-?worker|user|member|someone|person)\b/.test(text)) return flow('invite-teammate');
  return null;
}

/** The flow's module is part of the organisation's subscription (or the flow has none). */
export function flowAvailable(flow: OnboardingFlow, modules: SetupModules): boolean {
  return !flow.module || modules[flow.module];
}

/** The checklist as this organisation sees it: only the steps of the modules it subscribes to. */
export function checklistFor(modules: SetupModules) {
  return onboardingProgressOf(workspaceRepository.onboarding(), modules, isEmptyWorkspace());
}

/** The coach flow for the first unfinished checklist step that has one; undefined when nothing is left to coach. */
export function nextCoachFlow(modules: SetupModules): OnboardingFlow | undefined {
  for (const step of checklistFor(modules).steps) {
    if (step.done) continue;
    const flow = flowForChecklistStep(step.id);
    if (flow && flowAvailable(flow, modules)) return flow;
  }
  return undefined;
}

/** The intent the assistant can act on for this module set: one for a module the organisation lacks is dropped. */
export function startableSetupIntent(question: string, modules: SetupModules): SetupIntent | null {
  const intent = setupIntentFor(question);
  if (!intent) return null;
  if (intent.kind === 'coach' && !flowAvailable(intent.flow, modules)) return null;
  return intent;
}
