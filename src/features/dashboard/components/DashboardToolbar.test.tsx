import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardToolbar } from './DashboardToolbar';
import { PageTourProvider } from '../../../shared/lib/pageTourContext';
import { DEFAULT_FILTERS, type DashboardFilterState, type DashboardFilters } from '../model/dashboardFilters';

function filterState(overrides: Partial<DashboardFilterState> & { values?: Partial<DashboardFilters> } = {}): DashboardFilterState {
  const { values, ...rest } = overrides;
  const filters = { ...DEFAULT_FILTERS, ...values };
  return {
    filters,
    setTimeRange: vi.fn(),
    setEnvironment: vi.fn(),
    setSystem: vi.fn(),
    reset: vi.fn(),
    activeLabels: [],
    active: false,
    showSystem: true,
    ...rest,
  };
}

describe('DashboardToolbar', () => {
  it('has no free-text search box: the search opens the command palette', () => {
    render(<DashboardToolbar onRefresh={() => {}} />);
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows no filter selects when it is given none (nothing connected yet)', () => {
    render(<DashboardToolbar onRefresh={() => {}} />);
    expect(screen.queryByRole('group', { name: 'Dashboard filters' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(Time range|Environment|System)/ })).not.toBeInTheDocument();
  });

  it('opens the command palette, as Ctrl+K does, from the search button', async () => {
    const seen = vi.fn();
    const listener = (event: KeyboardEvent) => seen(event.key, event.ctrlKey);
    document.addEventListener('keydown', listener);
    try {
      render(<DashboardToolbar onRefresh={() => {}} />);
      await userEvent.setup().click(screen.getByRole('button', { name: /Search systems, resources, alerts/ }));
      expect(seen).toHaveBeenCalledWith('k', true);
    } finally {
      document.removeEventListener('keydown', listener);
    }
  });

  it('words the search for the modules the organisation has', () => {
    render(<DashboardToolbar onRefresh={() => {}} modules={{ cloudCost: false, sapMonitoring: true }} />);
    expect(screen.getByRole('button', { name: /Search systems, jobs, alerts/ })).toBeInTheDocument();
  });

  it('keeps the tour button last in the row, after Refresh', () => {
    render(<PageTourProvider value><DashboardToolbar onRefresh={() => {}} filters={filterState()} /></PageTourProvider>);
    const buttons = within(document.querySelector('.mv-dashboard-filters') as HTMLElement).getAllByRole('button');
    expect(buttons[buttons.length - 1]).toHaveAccessibleName('Take a tour of this page');
    expect(buttons[buttons.length - 2]).toHaveAccessibleName('Refresh');
  });

  it('refreshes the dashboard data', async () => {
    const onRefresh = vi.fn();
    render(<DashboardToolbar onRefresh={onRefresh} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Refresh' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  describe('filters', () => {
    it('offers Time range, Environment and System with their current values', () => {
      render(<DashboardToolbar onRefresh={() => {}} filters={filterState()} />);
      const group = screen.getByRole('group', { name: 'Dashboard filters' });
      expect(within(group).getByRole('button', { name: /Time range/ })).toHaveTextContent('All time');
      expect(within(group).getByRole('button', { name: /Environment/ })).toHaveTextContent('All Environments');
      expect(within(group).getByRole('button', { name: /System/ })).toHaveTextContent('All Systems');
    });

    it('lists the real time ranges and applies the one picked in two clicks (open, pick)', async () => {
      const state = filterState();
      const user = userEvent.setup();
      render(<DashboardToolbar onRefresh={() => {}} filters={state} />);
      await user.click(screen.getByRole('button', { name: /Time range/ }));
      expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['All time', 'Last 24 Hours', 'Last 7 days', 'Last 30 days']);
      await user.click(screen.getByRole('option', { name: 'Last 7 days' }));
      expect(state.setTimeRange).toHaveBeenCalledWith('7d');
    });

    it('applies an environment and a system choice', async () => {
      const state = filterState();
      const user = userEvent.setup();
      render(<DashboardToolbar onRefresh={() => {}} filters={state} />);
      await user.click(screen.getByRole('button', { name: /Environment/ }));
      expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['All Environments', 'Production', 'QA', 'Development']);
      await user.click(screen.getByRole('option', { name: 'QA' }));
      expect(state.setEnvironment).toHaveBeenCalledWith('qa');

      await user.click(screen.getByRole('button', { name: /System/ }));
      expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['All Systems', 'SAP', 'Cloud']);
      await user.click(screen.getByRole('option', { name: 'Cloud' }));
      expect(state.setSystem).toHaveBeenCalledWith('cloud');
    });

    it('hides the System select when only one module is subscribed', () => {
      render(<DashboardToolbar onRefresh={() => {}} modules={{ cloudCost: true, sapMonitoring: false }} filters={filterState({ showSystem: false })} />);
      expect(screen.queryByRole('button', { name: /System/ })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Time range/ })).toBeInTheDocument();
    });

    it('hides the Environment select when there are no SAP systems to split', () => {
      render(<DashboardToolbar onRefresh={() => {}} modules={{ cloudCost: true, sapMonitoring: false }} filters={filterState({ showSystem: false })} />);
      expect(screen.queryByRole('button', { name: /Environment/ })).not.toBeInTheDocument();
    });

    it('says nothing about filters while every one is at its default', () => {
      render(<DashboardToolbar onRefresh={() => {}} filters={filterState()} />);
      expect(screen.queryByText(/filters? on/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Reset filters' })).not.toBeInTheDocument();
    });

    it('shows which filters are on, with a Reset link that resets them', async () => {
      const state = filterState({ values: { timeRange: '7d', environment: 'production' }, active: true, activeLabels: ['Last 7 days', 'Production'] });
      render(<DashboardToolbar onRefresh={() => {}} filters={state} />);
      expect(screen.getByRole('status')).toHaveTextContent('2 filters on');
      expect(screen.getByRole('status')).toHaveTextContent('Last 7 days · Production');
      await userEvent.setup().click(screen.getByRole('button', { name: 'Reset filters' }));
      expect(state.reset).toHaveBeenCalledTimes(1);
    });

    it('says "1 filter on" for a single filter', () => {
      render(<DashboardToolbar onRefresh={() => {}} filters={filterState({ values: { system: 'sap' }, active: true, activeLabels: ['SAP'] })} />);
      expect(screen.getByRole('status')).toHaveTextContent('1 filter on');
    });

    it('tells the user the environment filter applies to SAP systems when cloud is also on screen', () => {
      render(<DashboardToolbar onRefresh={() => {}} filters={filterState({ values: { environment: 'qa' }, active: true, activeLabels: ['QA'] })} />);
      expect(screen.getByRole('status')).toHaveTextContent('Applies to SAP systems');
    });

    it('leaves that hint out when only SAP is shown', () => {
      render(<DashboardToolbar onRefresh={() => {}} filters={filterState({ values: { environment: 'qa', system: 'sap' }, active: true, activeLabels: ['QA', 'SAP'] })} />);
      expect(screen.getByRole('status')).not.toHaveTextContent('Applies to SAP systems');
    });
  });
});
