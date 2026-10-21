import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { AdvisorRecommendationsPanel } from './AdvisorRecommendationsPanel';
import { BudgetAlertsPanel } from './BudgetAlertsPanel';
import { CspSavingsPanel } from './CspSavingsPanel';
import type { AzureAdvisorRecommendation } from '../model/azureTypes';

const advisor: AzureAdvisorRecommendation[] = [
  { shortDescription: { problem: 'Unattached managed disks', solution: 'Delete disks not attached to any VM' }, extendedProperties: { savingsAmount: '86.20', annualSavingsAmount: '1034.40' }, impact: 'Medium', category: 'Cost' },
  { shortDescription: { problem: 'Low utilisation virtual machines', solution: 'Resize or shut down underused VMs' }, extendedProperties: { savingsAmount: '412.50', annualSavingsAmount: '4950.00', term: 'P1Y' }, impact: 'High', category: 'Cost' },
];

describe('AdvisorRecommendationsPanel', () => {
  it('lists each recommendation with impact, saving per month and year, highest impact first', () => {
    render(<AdvisorRecommendationsPanel recommendations={advisor} />);
    expect(screen.getByRole('heading', { name: 'Advisor Recommendations' })).toBeInTheDocument();
    expect(screen.getByText(/2 recommendations from Azure Advisor, estimated to save \$498\.70 a month \(\$5,984\.40 a year\)/)).toBeInTheDocument();
    const items = within(screen.getByRole('list', { name: 'Azure Advisor recommendations' })).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Low utilisation virtual machines');
    expect(items[0]).toHaveTextContent('High impact');
    expect(items[0]).toHaveTextContent('1 year term');
    expect(items[0]).toHaveTextContent('$412.50');
    expect(items[0]).toHaveTextContent('$4,950.00 a year');
    expect(items[1]).toHaveTextContent('Medium impact');
  });

  it('says so when Advisor has nothing to recommend', () => {
    render(<AdvisorRecommendationsPanel recommendations={[]} />);
    expect(screen.getByText('Azure Advisor has no recommendations for this subscription.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

describe('BudgetAlertsPanel', () => {
  const budgets = [
    { name: 'Production Monthly Budget', amount: 18000, currentSpend: { amount: 14280.55 } },
    { name: 'Networking Hub Budget', amount: 1500, currentSpend: { amount: 1612.35 } },
    { name: 'Sandbox', amount: 1000, currentSpend: { amount: 100 } },
  ];

  it('shows budgets that are over or near their cap with how much is used, most urgent first', () => {
    render(<BudgetAlertsPanel budgets={budgets} alerts={[]} />);
    const items = within(screen.getByRole('list', { name: 'Budgets near or over their limit' })).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Networking Hub Budget');
    expect(items[0]).toHaveTextContent('Over budget');
    expect(items[0]).toHaveTextContent('$1,612.35 of $1,500.00 used (107.5%), $112.35 over');
    expect(items[1]).toHaveTextContent('Production Monthly Budget');
    expect(items[1]).toHaveTextContent('Near limit');
    expect(screen.queryByText('Sandbox')).not.toBeInTheDocument();
    expect(within(items[0]).getByRole('progressbar', { name: 'Networking Hub Budget used' })).toHaveAttribute('aria-valuenow', '100');
  });

  it('lists the alerts Azure has raised', () => {
    render(<BudgetAlertsPanel budgets={budgets} alerts={[{ name: 'Budget exceeded', description: 'Networking Hub Budget has passed its cap.' }]} />);
    const list = screen.getByRole('list', { name: 'Alerts raised by Azure' });
    expect(within(list).getByText('Budget exceeded')).toBeInTheDocument();
  });

  it('reassures when no budget is near its limit', () => {
    render(<BudgetAlertsPanel budgets={[budgets[2]]} alerts={[]} />);
    expect(screen.getByText('No budget is near its limit. 1 budget is under 75%.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('says so when no budget exists', () => {
    render(<BudgetAlertsPanel budgets={[]} alerts={[]} />);
    expect(screen.getByText('No budgets are configured for this subscription.')).toBeInTheDocument();
  });
});

describe('CspSavingsPanel', () => {
  const recs = [
    { id: 'csp-1', estimated_savings: 298.4, current_monthly_cost: 1420, resource_type: 'virtualMachines', description: 'Right-size vm-batch-worker.', action: 'Resize to a smaller SKU', resource_name: 'vm-batch-worker', resource_id: '/subscriptions/x/resourceGroups/rg/providers/Compute/vm-batch-worker' },
    { id: 'csp-3', estimated_savings: 512.75, current_monthly_cost: 0, resource_type: 'subscription', description: 'Consolidate App Service plans.', action: 'Merge plans', resource_name: 'Subscription-wide', resource_id: '9f8e7d6c-5b4a-4392-8271-605f4e3d2c1b' },
  ];

  it('states the flat CSP saving and lists each opportunity with its saving', () => {
    render(<CspSavingsPanel recommendations={recs} totalCost={10000} mspRate={0.07} />);
    expect(screen.getByText(/CSP pricing saves \$700\.00 a month \(7\.0% on \$10,000\.00 of spend\)/)).toBeInTheDocument();
    const items = within(screen.getByRole('list', { name: 'Maitsys CSP savings opportunities' })).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('vm-batch-worker');
    expect(items[0]).toHaveTextContent('$1,420.00 now, $1,121.60 after');
    expect(items[1]).toHaveTextContent('Subscription-wide');
  });

  it('says so with no opportunities', () => {
    render(<CspSavingsPanel recommendations={[]} totalCost={0} mspRate={0.07} />);
    expect(screen.getByText('No further savings opportunities are open for this subscription.')).toBeInTheDocument();
  });
});
