import type { OnboardingStep } from '../../../data-access';

export type SetupStepId = 'profile' | 'invite' | 'notifications' | 'cloud' | 'budget' | 'sap' | 'review';
export type SetupGroupId = 'platform' | 'cloud' | 'sap' | 'finish';
export type SetupModules = { cloudCost: boolean; sapMonitoring: boolean };

export interface SetupStepDefinition {
  id: SetupStepId;
  group: SetupGroupId;
  title: string;
  /** One line under the title in the rail and the header. */
  summary: string;
  /** The module a step needs; the step (and its group) is left out when the organisation does not subscribe to it. */
  module?: keyof SetupModules;
}

export const SETUP_GROUP_LABELS: Record<SetupGroupId, string> = {
  platform: 'Platform',
  cloud: 'Cloud Cost',
  sap: 'SAP Monitoring',
  finish: 'Finish',
};

export const SETUP_STEPS: readonly SetupStepDefinition[] = [
  { id: 'profile', group: 'platform', title: 'Company profile', summary: 'Name, logo and contact details' },
  { id: 'invite', group: 'platform', title: 'Invite users', summary: 'Bring in the people who use Mavera' },
  { id: 'notifications', group: 'platform', title: 'Notifications', summary: 'Who is told when something needs attention' },
  { id: 'cloud', group: 'cloud', title: 'Connect cloud accounts', summary: 'Azure, AWS, Google Cloud or SAP BTP', module: 'cloudCost' },
  { id: 'budget', group: 'cloud', title: 'First budget', summary: 'A monthly limit with an early warning', module: 'cloudCost' },
  { id: 'sap', group: 'sap', title: 'SAP connection', summary: 'Connect your first SAP system', module: 'sapMonitoring' },
  { id: 'review', group: 'finish', title: 'Review', summary: 'Check what is done and open Mavera' },
];

export interface SetupStep extends SetupStepDefinition {
  /** 1-based position among the steps this organisation sees. */
  number: number;
  complete: boolean;
}

export interface SetupGroup {
  id: SetupGroupId;
  label: string;
  steps: SetupStep[];
}

export interface SetupModel {
  steps: SetupStep[];
  groups: SetupGroup[];
  /** Steps that ask for something (every step but the Review). */
  total: number;
  done: number;
  percent: number;
  /** About a minute per open step. */
  minutesLeft: number;
}

export const MINUTES_PER_STEP = 1;

/** The onboarding-checklist step each wizard step is derived from; the profile is derived from the saved company profile. */
const CHECKLIST_STEP: Partial<Record<SetupStepId, OnboardingStep['id']>> = {
  invite: 'teammate',
  notifications: 'alerts',
  cloud: 'cloud',
  budget: 'budget',
  sap: 'sap',
};

/**
 * Pure: what the wizard shows, from the real stores. Nothing here is stored separately, so the wizard can never
 * disagree with the pages: a step is complete when the thing it sets up exists.
 */
export function deriveSetup(input: { checklist: readonly OnboardingStep[]; profileSaved: boolean; modules: SetupModules }): SetupModel {
  const doneIn = (id: OnboardingStep['id']) => input.checklist.find((step) => step.id === id)?.done ?? false;
  const offered = SETUP_STEPS.filter((step) => !step.module || input.modules[step.module]);
  const actionable = offered.filter((step) => step.id !== 'review');
  const completeOf = (step: SetupStepDefinition): boolean => {
    if (step.id === 'profile') return input.profileSaved;
    const checklistId = CHECKLIST_STEP[step.id];
    return checklistId ? doneIn(checklistId) : false;
  };
  const doneCount = actionable.filter(completeOf).length;
  const steps: SetupStep[] = offered.map((step, index) => ({
    ...step,
    number: index + 1,
    complete: step.id === 'review' ? doneCount === actionable.length : completeOf(step),
  }));
  const groups: SetupGroup[] = [];
  for (const step of steps) {
    const last = groups[groups.length - 1];
    if (last && last.id === step.group) last.steps.push(step);
    else groups.push({ id: step.group, label: SETUP_GROUP_LABELS[step.group], steps: [step] });
  }
  const total = actionable.length;
  return {
    steps,
    groups,
    total,
    done: doneCount,
    percent: total === 0 ? 100 : Math.round((doneCount / total) * 100),
    minutesLeft: (total - doneCount) * MINUTES_PER_STEP,
  };
}

/** "~3 min left", or "All done". */
export function minutesLabel(minutes: number): string {
  return minutes <= 0 ? 'All done' : `~${minutes} min left`;
}
