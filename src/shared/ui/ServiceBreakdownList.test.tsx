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

describe('ServiceBreakdownList compact view', () => {
  const MANY = Array.from({ length: 8 }, (_, i) => ({ service: `Service ${i + 1}`, usageType: 'Usage', cost: (8 - i) * 100 }));

  it('shows the top services and a Show all N services control that expands and collapses the list', async () => {
    const user = userEvent.setup();
    render(<ServiceBreakdownList lines={MANY} format={money} limit={6} headingLevel="h3" />);
    expect(screen.getByRole('heading', { level: 3, name: 'Service Breakdown' })).toBeInTheDocument();
    expect(screen.getByText('Top 6 of 8 service types · 8 usage line items')).toBeInTheDocument();
    expect(document.querySelectorAll('.mv-svc-item')).toHaveLength(6);
    expect(screen.queryByText('Service 7')).not.toBeInTheDocument();

    const more = screen.getByRole('button', { name: 'Show all 8 services' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    await user.click(more);
    expect(screen.getByText('Service 8')).toBeInTheDocument();
    expect(screen.getByText('8 service types · 8 usage line items')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show fewer services' }));
    expect(screen.queryByText('Service 7')).not.toBeInTheDocument();
  });

  it('keeps share bars and percentages relative to every service even when only the top is shown', () => {
    render(<ServiceBreakdownList lines={MANY} format={money} limit={2} />);
    expect(screen.getByText('22.2%')).toBeInTheDocument();
    expect(document.querySelectorAll('.mv-svc-item')).toHaveLength(2);
  });

  it('has no control and no "Top N of" text when everything fits', () => {
    render(<ServiceBreakdownList lines={MANY.slice(0, 3)} format={money} limit={6} />);
    expect(screen.queryByRole('button', { name: /^Show all/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Top /)).not.toBeInTheDocument();
  });
});
