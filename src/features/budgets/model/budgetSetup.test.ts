import { afterEach, describe, expect, it } from 'vitest';
import { budgetsRepository, setWorkspaceProfile } from '../../../data-access';
import { addEmailAlertChannel, createOrganisationBudget, validateOrganisationBudget } from './budgetSetup';

afterEach(() => setWorkspaceProfile('populated'));

describe('validateOrganisationBudget', () => {
  it('accepts a named budget with a positive limit and a percentage', () => {
    expect(validateOrganisationBudget({ name: 'Monthly', amount: '5000', threshold: '80' }, ['Other'])).toEqual({});
  });

  it('reports a missing or duplicate name, a bad limit and a bad percentage', () => {
    const errors = validateOrganisationBudget({ name: ' monthly ', amount: '0', threshold: '150' }, ['Monthly']);
    expect(errors.name).toMatch(/already exists/);
    expect(errors.amount).toMatch(/above zero/);
    expect(errors.threshold).toMatch(/1 to 100/);
    expect(validateOrganisationBudget({ name: '', amount: '', threshold: '80' }, []).name).toMatch(/name/);
  });
});

describe('budget setup actions', () => {
  it('creates an organisation-wide budget and an e-mail channel for every budget', () => {
    setWorkspaceProfile('empty');
    const budget = createOrganisationBudget({ name: ' First ', amount: 4200, threshold: 80 });
    expect(budget).toMatchObject({ name: 'First', target_amount: 4200, alert_threshold: 80, scope_type: 'organization' });
    const channel = addEmailAlertChannel(['a@x.com', 'b@x.com']);
    expect(channel).toMatchObject({ provider: 'email', alert_scope: 'global', email_addresses: ['a@x.com', 'b@x.com'] });
    expect(budgetsRepository.listBudgets()).toHaveLength(1);
    expect(budgetsRepository.listChannels()).toHaveLength(1);
  });
});
