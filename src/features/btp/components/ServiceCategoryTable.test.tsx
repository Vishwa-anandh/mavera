import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServiceCategoryTable } from './ServiceCategoryTable';

const services = [
  { name: 'SAP HANA Cloud', cost: 600, previousCost: 500 },
  { name: 'Cloud Foundry Runtime', cost: 100, previousCost: 200 },
  { name: 'Object Store', cost: 300, previousCost: 300 },
];

function categories(): string[] {
  const table = screen.getByRole('table');
  return within(table).getAllByRole('row').slice(1, -1).map((row) => within(row).getAllByRole('cell')[0].textContent ?? '');
}

describe('ServiceCategoryTable', () => {
  it('lists each category with count, cost, share and trend, and a Total row last', () => {
    render(<ServiceCategoryTable services={services} currency="EUR" />);
    const rows = screen.getAllByRole('row');
    expect(within(rows[1]).getAllByRole('cell').map((c) => c.textContent)).toEqual(['Data & Analytics', '1', '€600.00', '60.0%', 'Up 20%']);
    expect(within(rows[2]).getByText('Storage')).toBeInTheDocument();
    const total = rows[rows.length - 1];
    expect(within(total).getByRole('rowheader')).toHaveTextContent('Total');
    expect(total).toHaveTextContent('3');
    expect(total).toHaveTextContent('€1,000.00');
    expect(total).toHaveTextContent('100.0%');
  });

  it('sorts by cost, highest first, and reverses on click while the Total stays last', async () => {
    const user = userEvent.setup();
    render(<ServiceCategoryTable services={services} currency="EUR" />);
    expect(categories()).toEqual(['Data & Analytics', 'Storage', 'DevOps & Platform']);
    const header = screen.getByRole('columnheader', { name: /Total cost/ });
    expect(header).toHaveAttribute('aria-sort', 'descending');

    await user.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(categories()).toEqual(['DevOps & Platform', 'Storage', 'Data & Analytics']);
    const rows = screen.getAllByRole('row');
    expect(within(rows[rows.length - 1]).getByRole('rowheader')).toHaveTextContent('Total');
  });

  it('says there is nothing to group when there are no services', () => {
    render(<ServiceCategoryTable services={[]} currency="EUR" />);
    expect(screen.getByText('No services to group yet.')).toBeInTheDocument();
  });
});
