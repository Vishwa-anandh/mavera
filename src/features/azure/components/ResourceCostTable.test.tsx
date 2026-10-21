import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RESOURCES_COLLAPSED, ResourceCostTable } from './ResourceCostTable';
import type { AzureResourceItem } from '../model/azureTypes';

const resources: AzureResourceItem[] = Array.from({ length: 12 }, (_, i) => ({
  id: `/subscriptions/s/resourceGroups/rg/providers/Microsoft.Compute/virtualMachines/vm-${i}`,
  name: `vm-${String(i).padStart(2, '0')}`,
  type: 'Virtual Machines',
  resourceGroup: 'rg',
  cost: 100 - i * 10 > 0 ? 100 - i * 10 : 0,
  hasSpend: 100 - i * 10 > 0,
}));

describe('ResourceCostTable', () => {
  it('shows the top resources by cost with the CSP saving at the given rate', () => {
    render(<ResourceCostTable resources={[...resources].reverse()} mspRate={0.07} />);
    expect(screen.getByRole('columnheader', { name: 'CSP Savings (7%)' })).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(RESOURCES_COLLAPSED + 1);
    const first = within(rows[1]).getAllByRole('cell');
    expect(first.map((c) => c.textContent)).toEqual(['01', 'vm-00', 'Virtual Machines', '$100.00', '$7.00']);
  });

  it('expands with "Show all N resources" and collapses again, announcing the state', async () => {
    const user = userEvent.setup();
    render(<ResourceCostTable resources={resources} mspRate={0.07} />);
    const toggle = screen.getByRole('button', { name: 'Show all 12 resources' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(screen.getAllByRole('row')).toHaveLength(13);
    const collapse = screen.getByRole('button', { name: 'Show fewer resources' });
    expect(collapse).toHaveAttribute('aria-expanded', 'true');
    // Unused resources are listed too, with no saving.
    expect(screen.getByRole('cell', { name: 'vm-11' })).toBeInTheDocument();

    await user.click(collapse);
    expect(screen.getAllByRole('row')).toHaveLength(RESOURCES_COLLAPSED + 1);
  });

  it('has no toggle when everything already fits', () => {
    render(<ResourceCostTable resources={resources.slice(0, 5)} mspRate={0.07} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(6);
  });

  it('labels a bare subscription id as subscription-wide', () => {
    render(<ResourceCostTable resources={[{ id: '/subscriptions/9f8e7d6c-5b4a-4392-8271-605f4e3d2c1b', name: 'x', type: 'Other', resourceGroup: 'rg', cost: 5, hasSpend: true }]} mspRate={0.07} />);
    expect(screen.getByRole('cell', { name: 'Subscription-wide' })).toBeInTheDocument();
  });

  it('says so when there are no resources', () => {
    render(<ResourceCostTable resources={[]} mspRate={0.07} />);
    expect(screen.getByText('No resources are listed for this subscription.')).toBeInTheDocument();
  });
});
