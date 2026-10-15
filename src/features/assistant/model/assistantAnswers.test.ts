import { describe, it, expect } from 'vitest';
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
