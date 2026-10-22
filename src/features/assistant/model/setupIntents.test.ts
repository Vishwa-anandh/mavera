import { beforeEach, describe, expect, it } from 'vitest';
import { workspaceRepository } from '../../../data-access';
import { checklistFor, nextCoachFlow, setupIntentFor, startableSetupIntent } from './setupIntents';

const ALL = { cloudCost: true, sapMonitoring: true };
const flowKey = (text: string) => {
  const intent = setupIntentFor(text);
  return intent?.kind === 'coach' ? intent.flow.key : intent?.kind;
};

beforeEach(() => workspaceRepository.setProfile('empty'));

describe('setupIntentFor', () => {
  it('reads the connect chips and typed variants', () => {
    expect(flowKey('Help me connect Azure')).toBe('connect-azure');
    expect(flowKey('help me connect aws')).toBe('connect-aws');
    expect(flowKey('Connect Google Cloud')).toBe('connect-gcp');
    expect(flowKey('how do I connect gcp?')).toBe('connect-gcp');
    expect(flowKey('Help me connect SAP BTP')).toBe('connect-btp');
    expect(flowKey('Help me connect SAP')).toBe('connect-sap');
    expect(flowKey('connect my SAP system')).toBe('connect-sap');
    expect(flowKey('I want to connect a cloud account')).toBe('connect-azure');
  });

  it('reads the other flows, the checklist and "set me up"', () => {
    expect(flowKey('Help me create a budget')).toBe('create-budget');
    expect(flowKey('add a budget')).toBe('create-budget');
    expect(flowKey('Add alert recipients')).toBe('add-alert-recipients');
    expect(flowKey('who gets the alerts')).toBe('add-alert-recipients');
    expect(flowKey('Invite a teammate')).toBe('invite-teammate');
    expect(flowKey('add a user')).toBe('invite-teammate');
    expect(flowKey('Show my checklist')).toBe('checklist');
    expect(flowKey('checklist')).toBe('checklist');
    expect(flowKey('Set me up')).toBe('setup');
    expect(flowKey('Start the checklist')).toBe('setup');
    expect(flowKey('getting started')).toBe('setup');
  });

  it('leaves ordinary questions alone', () => {
    for (const text of ['What is our cloud spend this month?', 'azure spend', 'System health', 'Unread SAP alerts', 'Generate report', 'hello', '']) {
      expect(setupIntentFor(text), text).toBeNull();
    }
  });

  it('drops a flow whose module the organisation does not subscribe to', () => {
    expect(startableSetupIntent('Help me connect SAP', { cloudCost: true, sapMonitoring: false })).toBeNull();
    expect(startableSetupIntent('Help me connect Azure', { cloudCost: false, sapMonitoring: true })).toBeNull();
    expect(startableSetupIntent('Help me connect Azure', ALL)?.kind).toBe('coach');
    expect(startableSetupIntent('Show my checklist', { cloudCost: false, sapMonitoring: false })?.kind).toBe('checklist');
  });
});

describe('the checklist for a set of modules', () => {
  it('lists only the steps of subscribed modules and coaches the first unfinished one', () => {
    expect(checklistFor(ALL).total).toBe(6);
    expect(checklistFor({ cloudCost: true, sapMonitoring: false }).steps.map((s) => s.id)).toEqual(['cloud', 'budget', 'alerts', 'teammate', 'tour']);
    expect(nextCoachFlow(ALL)?.key).toBe('connect-azure');
    expect(nextCoachFlow({ cloudCost: false, sapMonitoring: true })?.key).toBe('connect-sap');
    workspaceRepository.reset();
  });
});
