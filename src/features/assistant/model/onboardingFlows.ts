import type { OnboardingStepId } from '../../../data-access';
import { CHECKLIST_COACH_FLOWS } from '../../../shared/lib/assistantEvents';
import type { ConnectProviderKey, FlowTour, TourSignal, TourStep } from './flowGuides';

/**
 * The live coach flows for getting a new organisation set up. Unlike a page tour (which only points at things
 * and waits for Next), each step here says what to do ("Do this: click Connect"), waits until the person has
 * done it and moves on by itself; steps may open a form or go to another page first. They work from any page.
 *
 * Stable selectors the steps rely on:
 *   the shared connect dialog (src/features/workspace)  data-tour="connect-dialog" | "use-sample-credentials" |
 *                                                       "connect-submit" | "connect-provider-<azure|aws|gcp|btp|sap>"
 *   Budgets & Alerts       budget-name, budget-amount, budget-submit, channel-recipients, channel-submit
 *   User Management        add-user-email, add-user-name, add-user-submit
 */
export interface OnboardingFlow extends FlowTour {
  /** The assistant chip and button text, e.g. "Help me connect Azure". */
  chip: string;
  /** One line on what the flow does, for the tour picker. */
  summary: string;
  /** The subscribed module the flow belongs to; absent means every organisation. */
  module?: 'cloudCost' | 'sapMonitoring';
  /** The checklist step this flow completes. */
  checklistStep: OnboardingStepId;
  /** The count that goes up when the flow's last action is done. */
  signal: TourSignal;
}

const tour = (name: string) => `[data-tour="${name}"]`;
const css = (name: string) => `css:${tour(name)}`;

interface ProviderCopy {
  name: string;
  chip: string;
  noun: string;
  module: 'cloudCost' | 'sapMonitoring';
  signal: TourSignal;
  intro: string;
}

const PROVIDERS: Record<ConnectProviderKey, ProviderCopy> = {
  azure: { name: 'Azure', chip: 'Help me connect Azure', noun: 'an Azure subscription', module: 'cloudCost', signal: 'accounts', intro: 'Mavera reads costs through a read-only service principal (tenant, application and secret).' },
  aws: { name: 'AWS', chip: 'Help me connect AWS', noun: 'an AWS account', module: 'cloudCost', signal: 'accounts', intro: 'Mavera reads costs through a read-only role (access key and secret, or a role to assume).' },
  gcp: { name: 'Google Cloud', chip: 'Help me connect Google Cloud', noun: 'a Google Cloud project', module: 'cloudCost', signal: 'accounts', intro: 'Mavera reads costs through a read-only service account key for your billing export.' },
  btp: { name: 'SAP BTP', chip: 'Help me connect SAP BTP', noun: 'an SAP BTP global account', module: 'cloudCost', signal: 'accounts', intro: 'Mavera reads usage through the global account’s service key.' },
  sap: { name: 'SAP system', chip: 'Help me connect SAP', noun: 'an SAP system', module: 'sapMonitoring', signal: 'destinations', intro: 'Mavera reaches your system through a destination (host, instance and a monitoring user).' },
};

function connectFlow(provider: ConnectProviderKey): OnboardingFlow {
  const p = PROVIDERS[provider];
  const steps: TourStep[] = [
    {
      target: css('connect-dialog'),
      title: `Opening the ${p.name} form`,
      body: 'One moment while the form opens.',
      enter: { openConnect: provider },
      waitFor: { kind: 'element', selector: tour('connect-dialog') },
      action: 'Opening the form…',
    },
    {
      // When the form opens on its provider picker instead of on the credentials, this step asks for the pick.
      target: css(`connect-provider-${provider}`),
      title: `Choose ${p.name}`,
      body: `Pick ${p.name} so the form asks for the right details.`,
      action: `Do this: choose ${p.name}`,
      waitFor: { kind: 'click' },
      optional: true,
    },
    {
      target: css('use-sample-credentials'),
      tag: 'Credentials',
      title: 'Fill in the credentials',
      body: `${p.intro} For this prototype one click fills a valid example set; to use your own, type them into the form instead.`,
      action: 'Do this: click Use sample credentials',
      waitFor: [{ kind: 'click' }, { kind: 'change', signal: p.signal }],
    },
    {
      target: css('connect-submit'),
      tag: 'Action',
      title: provider === 'sap' ? 'Connect the system' : 'Connect the account',
      body: 'Mavera checks the details and then syncs the first costs. The sample data you see afterwards is labelled as sample data.',
      action: 'Do this: click Connect',
      waitFor: { kind: 'change', signal: p.signal },
    },
    {
      target: 'none:',
      title: provider === 'sap' ? 'The SAP system is connected' : `${p.name} is connected`,
      body: provider === 'sap'
        ? 'Your SAP pages now show this system. Next on the checklist: create a budget, add alert recipients and invite a teammate.'
        : 'Your dashboard, Cost Overview and alerts now show this account. Next on the checklist: create a budget, add alert recipients and invite a teammate.',
    },
  ];
  return {
    key: `connect-${provider}`,
    label: provider === 'sap' ? 'Connect an SAP system' : `Connect ${p.name}`,
    chip: p.chip,
    summary: `Connect ${p.noun} in about two clicks`,
    module: p.module,
    checklistStep: provider === 'sap' ? 'sap' : 'cloud',
    signal: p.signal,
    steps,
  };
}

const BUDGET_FLOW: OnboardingFlow = {
  key: 'create-budget',
  label: 'Create a budget',
  chip: 'Help me create a budget',
  summary: 'Set a spending limit and when to be warned',
  module: 'cloudCost',
  checklistStep: 'budget',
  signal: 'budgets',
  steps: [
    {
      // Mavera proposes a name; the step passes by itself when the field already has one.
      target: css('budget-name'),
      tag: 'Form',
      title: 'Name the budget',
      body: 'A budget is a monthly spending limit. Name it after what it covers, for example the team or the project.',
      action: 'Do this: type a name for the budget',
      hint: 'In a hurry? “Fill it in for me” adds an example name and a limit.',
      enter: { navigate: '/budgets?open=new' },
      waitFor: { kind: 'field', selector: tour('budget-name') },
      fill: [{ selector: tour('budget-name'), value: 'Monthly cloud budget' }, { selector: tour('budget-amount'), value: '5000' }],
    },
    {
      target: css('budget-amount'),
      tag: 'Form',
      title: 'Set the limit',
      body: 'The most you want to spend in a month. Use the suggested limit below the field, or type your own. You get an alert when spend reaches the threshold below it (80 percent by default).',
      action: 'Do this: set a target amount',
      waitFor: { kind: 'field', selector: tour('budget-amount') },
      fill: [{ selector: tour('budget-amount'), value: '5000' }],
    },
    {
      target: css('budget-submit'),
      tag: 'Action',
      title: 'Save it',
      body: 'The budget appears in the list straight away and starts watching your spend.',
      action: 'Do this: click Add Budget',
      waitFor: { kind: 'change', signal: 'budgets' },
    },
    { target: 'none:', title: 'Budget created', body: 'You will be alerted when spend crosses the threshold. Next on the checklist: choose who is told, under Add alert recipients.' },
  ],
};

const RECIPIENTS_FLOW: OnboardingFlow = {
  key: 'add-alert-recipients',
  label: 'Add alert recipients',
  chip: 'Add alert recipients',
  summary: 'Choose who is emailed when an alert fires',
  checklistStep: 'alerts',
  signal: 'recipients',
  steps: [
    {
      // Your own address starts in the list; the step passes by itself when there is already a recipient.
      target: css('channel-recipients'),
      tag: 'Form',
      title: 'Who should be told?',
      body: 'Type the email address of the person or team list that should receive budget and cost alerts, then press Enter. You can add more than one.',
      action: 'Do this: type an email address',
      hint: 'The channel covers every budget (a global alert) unless you choose otherwise.',
      enter: { navigate: '/budgets?open=add-channel#integrations' },
      waitFor: [{ kind: 'field', selector: tour('channel-recipients') }, { kind: 'element', selector: '.mv-dialog .mv-recipient' }],
      fill: [{ selector: tour('channel-recipients'), value: 'finance@northwind.example' }],
    },
    {
      target: css('channel-submit'),
      tag: 'Action',
      title: 'Add the channel',
      body: 'Alerts for every budget now go to this address.',
      action: 'Do this: click Add channel',
      waitFor: { kind: 'change', signal: 'recipients' },
    },
    { target: 'none:', title: 'Alert recipient added', body: 'Alerts will now reach that address as well as showing in Mavera. Pause or remove the channel any time on Alert integrations.' },
  ],
};

const TEAMMATE_FLOW: OnboardingFlow = {
  key: 'invite-teammate',
  label: 'Invite a teammate',
  chip: 'Invite a teammate',
  summary: 'Add a colleague with a role that fits',
  checklistStep: 'teammate',
  signal: 'members',
  steps: [
    {
      target: css('add-user-email'),
      tag: 'Form',
      title: 'Who are you inviting?',
      body: 'Their work email is all that is needed (the name is optional). They begin as a Viewer, which you can change in the member table.',
      action: 'Do this: type their work email',
      hint: 'In a hurry? “Fill it in for me” adds an example person.',
      enter: { navigate: '/users?open=add-user' },
      waitFor: { kind: 'field', selector: tour('add-user-email') },
      fill: [{ selector: tour('add-user-email'), value: 'alex.morgan@northwind.example' }],
    },
    {
      target: css('add-user-submit'),
      tag: 'Action',
      title: 'Add them',
      body: 'They use one seat and appear in the member table straight away.',
      action: 'Do this: click Add user',
      waitFor: { kind: 'change', signal: 'members' },
    },
    { target: 'none:', title: 'Teammate added', body: 'They show in the member table. Use the role and access controls there to give them exactly what they need.' },
  ],
};

export const ONBOARDING_FLOWS: OnboardingFlow[] = [
  connectFlow('azure'),
  connectFlow('aws'),
  connectFlow('gcp'),
  connectFlow('btp'),
  connectFlow('sap'),
  BUDGET_FLOW,
  RECIPIENTS_FLOW,
  TEAMMATE_FLOW,
];

export function onboardingFlowByKey(key: string): OnboardingFlow | undefined {
  return ONBOARDING_FLOWS.find((flow) => flow.key === key);
}

/** The flow that coaches a checklist step: Azure is the default first cloud account; the tour step has none. */
export function flowForChecklistStep(id: OnboardingStepId): OnboardingFlow | undefined {
  const key = CHECKLIST_COACH_FLOWS[id];
  return key ? onboardingFlowByKey(key) : undefined;
}

/** The flows an organisation can use, given the modules it subscribes to. */
export function onboardingFlowsFor(modules: { cloudCost: boolean; sapMonitoring: boolean }): OnboardingFlow[] {
  return ONBOARDING_FLOWS.filter((flow) => !flow.module || modules[flow.module]);
}
