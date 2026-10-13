import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { cloudInsightsRepository } from '../../../data-access';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { resetOpportunityStates } from '../model/optimizationStore';
import { formatMoney } from '../model/cloudFormat';
import { CostAnalyticsPage } from './CostAnalyticsPage';
import { OptimizationAdvisorPage } from './OptimizationAdvisorPage';
import { ReservationsPage } from './ReservationsPage';
import { ResourceInventoryPage } from './ResourceInventoryPage';

const wrap = (node: ReactNode) => render(<ThemeProvider><MemoryRouter>{node}</MemoryRouter></ThemeProvider>);

describe('Cloud Cost pages', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    resetOpportunityStates();
  });

  it('Cost Analytics never adds EUR (SAP BTP) to USD totals', async () => {
    const user = userEvent.setup();
    wrap(<CostAnalyticsPage />);
    expect(screen.getByText(/SAP BTP is billed in EUR/)).toBeInTheDocument();
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Providers'));
    await user.click(screen.getByRole('option', { name: 'SAP BTP (EUR)' }));
    expect(screen.getAllByText(/€/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/SAP BTP is billed in EUR/)).not.toBeInTheDocument();
  });

  it('Cost Analytics says when a provider has no history to compare', () => {
    wrap(<CostAnalyticsPage />);
    expect(screen.getByText(/Excludes Google Cloud \(no history\)/)).toBeInTheDocument();
    expect(screen.getAllByText('No history').length).toBeGreaterThan(0);
  });

  it('Resource Inventory shows missing tags as Untagged and missing cost as Not reported', async () => {
    const user = userEvent.setup();
    wrap(<ResourceInventoryPage />);
    expect(screen.getAllByText('Not reported').length).toBeGreaterThan(0);

    await user.click(screen.getByLabelText('Tags'));
    await user.click(screen.getByRole('option', { name: 'Untagged' }));
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(within(row).getByText('Untagged')).toBeInTheDocument();
  });

  it('Optimization Advisor leaves overlapping recommendations out of the total', () => {
    wrap(<OptimizationAdvisorPage />);
    const all = cloudInsightsRepository.listOptimizationOpportunities();
    const expected = all.filter((o) => !o.overlapsWith || !all.some((x) => x.id === o.overlapsWith)).reduce((s, o) => s + o.monthlySaving, 0);
    expect(screen.getByText(formatMoney(expected, 'USD'))).toBeInTheDocument();
    expect(screen.getByText(/1 overlapping not double-counted/)).toBeInTheDocument();
  });

  it('Optimization Advisor dismisses with a reason and only records the decision', async () => {
    const user = userEvent.setup();
    wrap(<OptimizationAdvisorPage />);
    await user.click(screen.getByRole('button', { name: 'Merge App Service plans' }));
    const drawer = screen.getByRole('dialog', { name: 'Merge App Service plans' });
    expect(within(drawer).getByText(/doesn’t change cloud resources/)).toBeInTheDocument();
    await user.click(within(drawer).getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('button', { name: 'Merge App Service plans' })).not.toBeInTheDocument();
    expect(screen.getByText('1 dismissed')).toBeInTheDocument();
  });

  it('Reserved Instances lists the nearest expiry first and labels recommendations as estimates', () => {
    wrap(<ReservationsPage />);
    const names = screen.getAllByRole('row').slice(1).map((row) => row.querySelector('button')?.textContent);
    const ends = cloudInsightsRepository.listReservations().sort((a, b) => a.end.localeCompare(b.end)).map((r) => r.name);
    expect(names).toEqual(ends);
    expect(screen.getByText(/Not a purchase/)).toBeInTheDocument();
  });
});
