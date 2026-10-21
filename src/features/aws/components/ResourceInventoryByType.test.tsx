import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ResourceInventoryByType } from './ResourceInventoryByType';

const resources = {
  total: 101,
  byType: [
    { type: 'Subnets', count: 40, icon: 'layers' },
    { type: 'Security Groups', count: 60, icon: 'shield' },
    { type: 'Lambda Functions', count: 1, icon: 'zap' },
  ],
};

describe('ResourceInventoryByType', () => {
  it('lists each resource type with its count and share, biggest first', () => {
    render(<ResourceInventoryByType resources={resources} />);
    expect(screen.getByRole('heading', { name: 'Resource Inventory' })).toBeInTheDocument();
    expect(screen.getByText('101 resources across 3 types.')).toBeInTheDocument();
    const items = within(screen.getByRole('list', { name: 'Resources by type' })).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      'Security Groups6059.4% of resources',
      'Subnets4039.6% of resources',
      'Lambda Functions11.0% of resources',
    ]);
  });

  it('says so with no resources', () => {
    render(<ResourceInventoryByType resources={{ total: 0, byType: [] }} />);
    expect(screen.getByText('No resources are listed for this account.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
