import { describe, it, expect, afterEach } from 'vitest';
import { accessRepository, budgetsRepository, smartAlertsRepository, workspaceRepository } from '../../../data-access';
import { answerFromDemoData } from './assistantAnswers';

const ALL = { cloudCost: true, sapMonitoring: true };

describe('answerFromDemoData', () => {
  it('answers cloud spend from the sample data and says it is sample data', () => {
    const answer = answerFromDemoData('What is our cloud spend this month?', ALL)!;
    expect(answer).toMatch(/Month-to-date cloud spend is \$/);
    expect(answer).toMatch(/Azure/);
    expect(answer).toMatch(/SAP BTP: €/);
    expect(answer).toMatch(/Sample data/);
  });

  it('never adds EUR (SAP BTP) into the USD total', () => {
    expect(answerFromDemoData('how much did we spend', ALL)).toMatch(/billed separately, so not added/);
  });

  it('answers savings, top services and reservations', () => {
    expect(answerFromDemoData('Top savings', ALL)).toMatch(/open opportunities worth about \$/);
    expect(answerFromDemoData('which services cost the most', ALL)).toMatch(/costing the most this month/);
    expect(answerFromDemoData('Expiring reservations', ALL)).toMatch(/reservation or savings plan/);
  });

  it('answers SAP health, alerts, HANA, jobs, disk, security and performance', () => {
    expect(answerFromDemoData('System health', ALL)).toMatch(/3 healthy, 1 warning, 1 critical/);
    expect(answerFromDemoData('Unread SAP alerts', ALL)).toMatch(/unread SAP alerts? out of/);
    expect(answerFromDemoData('how is hana memory', ALL)).toMatch(/HANA host GRH: memory 52%/);
    expect(answerFromDemoData('any failed jobs or dumps?', ALL)).toMatch(/Background jobs:/);
    expect(answerFromDemoData('is any disk full', ALL)).toMatch(/\/backup \(94%\)/);
    expect(answerFromDemoData('security notes', ALL)).toMatch(/SAP security notes/);
    expect(answerFromDemoData('response time', ALL)).toMatch(/response time is 53 ms/);
  });

  it('says a module is not subscribed instead of answering from it', () => {
    expect(answerFromDemoData('System health', { ...ALL, sapMonitoring: false })).toMatch(/SAP Monitoring isn't part of your organisation's subscription/);
    expect(answerFromDemoData('cloud spend', { ...ALL, cloudCost: false })).toMatch(/Cloud Cost isn't part of your organisation's subscription/);
  });

  it('points report questions at the export, greets, and points how-to questions at the tour', () => {
    expect(answerFromDemoData('Generate report', ALL)).toMatch(/Export report/);
    expect(answerFromDemoData('hello', ALL)).toMatch(/I can answer from the sample data about/);
    expect(answerFromDemoData('how do I get around here', ALL)).toMatch(/guided tour/);
  });

  it('returns null for something it does not recognise, so the caller can say so honestly', () => {
    expect(answerFromDemoData('Tell me a joke about clouds', ALL)).toBeNull();
    expect(answerFromDemoData('   ', ALL)).toBeNull();
  });
});

describe('setting up', () => {
  afterEach(() => workspaceRepository.reset());

  it('answers "Help me connect ..." for every provider, naming the live guide it starts', () => {
    for (const [question, label] of [
      ['Help me connect Azure', 'Connect Azure'],
      ['Help me connect AWS', 'Connect AWS'],
      ['Help me connect Google Cloud', 'Connect Google Cloud'],
      ['Help me connect SAP BTP', 'Connect SAP BTP'],
      ['Help me connect SAP', 'Connect an SAP system'],
    ]) {
      const answer = answerFromDemoData(question, ALL)!;
      expect(answer, question).toContain(`Starting the live guide: ${label}.`);
      expect(answer, question).toMatch(/Skip this step/);
    }
  });

  it('answers the other setup flows and does not mistake them for data questions', () => {
    expect(answerFromDemoData('Help me create a budget', ALL)).toMatch(/Starting the live guide: Create a budget/);
    expect(answerFromDemoData('Add alert recipients', ALL)).toMatch(/Starting the live guide: Add alert recipients/);
    expect(answerFromDemoData('Invite a teammate', ALL)).toMatch(/Starting the live guide: Invite a teammate/);
  });

  it('says a connect flow needs a module the organisation does not have', () => {
    expect(answerFromDemoData('Help me connect SAP', { ...ALL, sapMonitoring: false })).toMatch(/SAP Monitoring isn't part of your organisation's subscription/);
    expect(answerFromDemoData('Help me connect Azure', { ...ALL, cloudCost: false })).toMatch(/Cloud Cost isn't part of your organisation's subscription/);
  });

  it('shows the checklist progress and names the next step for a brand-new organisation', () => {
    workspaceRepository.setProfile('empty');
    expect(answerFromDemoData('Show my checklist', ALL)).toMatch(/0 of 6 steps are done\. Next: connect a cloud account\./);
    expect(answerFromDemoData('Set me up', ALL)).toMatch(/Let us get you set up\. 0 of 6 steps are done\./);
    expect(answerFromDemoData('Set me up', { cloudCost: true, sapMonitoring: false })).toMatch(/0 of 5 steps are done/);
  });

  it('keeps count as steps get done, and says so when the checklist is finished', () => {
    workspaceRepository.setProfile('empty');
    const cloudOnly = { cloudCost: true, sapMonitoring: false };
    workspaceRepository.markTourDone();
    workspaceRepository.addConnectedAccount('azure', { name: 'Prod', tenantId: 't', subscriptionId: 's', clientId: 'c' } as never);
    expect(answerFromDemoData('Show my checklist', cloudOnly)).toMatch(/2 of 5 steps are done\. Next: create a budget\./);

    budgetsRepository.createBudget({ name: 'Cap', target_amount: 1000, alert_threshold: 80, scope_type: 'organization', scope_value: '' });
    smartAlertsRepository.addRecipient('cost_threshold', 'finance@example.com');
    accessRepository.addMember({ userId: 'a', fullName: 'A', email: 'a@example.com', role: 'admin', roleId: 'owner', status: 'active', alertsEnabled: true, lastActiveAt: '2026-10-01T00:00:00.000Z' });
    accessRepository.addMember({ userId: 'b', fullName: 'B', email: 'b@example.com', role: 'member', roleId: 'viewer', status: 'active', alertsEnabled: true, lastActiveAt: '2026-10-01T00:00:00.000Z' });
    expect(answerFromDemoData('Show my checklist', cloudOnly)).toMatch(/Everything on your getting started checklist is done \(5 of 5\)/);
    expect(answerFromDemoData('Set me up', cloudOnly)).toMatch(/Everything on your getting started checklist is done/);
  });
});
