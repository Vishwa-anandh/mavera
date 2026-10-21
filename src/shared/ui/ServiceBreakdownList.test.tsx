import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServiceBreakdownList, groupServiceLines } from './ServiceBreakdownList';

const LINES = [
  { service: 'Amazon EC2', usageType: 'BoxUsage:m5.large', cost: 600 },
  { service: 'Amazon EC2', usageType: 'EBS:VolumeUsage', cost: 300 },
  { service: 'Amazon S3', usageType: 'TimedStorage', cost: 100 },
];
const money = (value: number) => `$${value.toFixed(2)}`;

describe('groupServiceLines', () => {
  it('groups usage lines by service, biggest first, with shares that total exactly 100', () => {
    const groups = groupServiceLines([...LINES, { service: 'Tax', usageType: 'Tax', cost: 0.01 }]);
    expect(groups.map((g) => g.service)).toEqual(['Amazon EC2', 'Amazon S3', 'Tax']);
    expect(groups[0].lines.map((l) => l.usageType)).toEqual(['BoxUsage:m5.large', 'EBS:VolumeUsage']);
    expect(groups.reduce((sum, g) => sum + g.sharePct, 0)).toBeCloseTo(100, 5);
  });

  it('returns no groups for no lines', () => expect(groupServiceLines([])).toEqual([]));
});

describe('ServiceBreakdownList', () => {
  it('summarises service types and usage lines, and opens a service to show its lines with the CSP saving', async () => {
    const user = userEvent.setup();
    render(<ServiceBreakdownList lines={LINES} cspRate={0.035} format={money} />);
    expect(screen.getByText('2 service types · 3 usage line items')).toBeInTheDocument();

    const ec2 = screen.getByRole('button', { name: /Amazon EC2/ });
    expect(ec2).toHaveAttribute('aria-expanded', 'false');
    expect(ec2).toHaveTextContent('90.0%');
    expect(ec2).toHaveTextContent('$900.00');
    expect(ec2).toHaveTextContent('2 types');
    expect(screen.queryByText('BoxUsage:m5.large')).toBeNull();

    await user.click(ec2);
    expect(ec2).toHaveAttribute('aria-expanded', 'true');
    const list = screen.getByText('BoxUsage:m5.large').closest('ul')!;
    expect(within(list).getByText('$21.00')).toBeInTheDocument();
    expect(within(list).getByText(/CSP saving at 3.5%/)).toBeInTheDocument();

    await user.click(ec2);
    expect(screen.queryByText('BoxUsage:m5.large')).toBeNull();
  });
});
