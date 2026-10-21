import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { CloudSpendSummary, type CloudSpendSummaryProps } from './CloudSpendSummary';

const base: CloudSpendSummaryProps = {
  isCurrentMonth: true,
  spend: 14280.55,
  changePct: -2.4,
  daily: [500, 520, 480, 600],
  daysInMonth: 30,
  forecast: 15867.28,
  lastMonthTotal: 14630.8,
  dailyAverage: 528.91,
  todaySpend: 411.9,
  savings: 999.64,
  savingsLines: ['7% CSP discount · 6.5% of gross spend'],
  facts: [{ label: 'Enabled services', value: '8', detail: '16 cost-tracked resources' }, { label: 'Total resources', value: '19', detail: '16 active' }],
};
const renderSummary = (props: Partial<CloudSpendSummaryProps> = {}) => render(<CloudSpendSummary {...base} {...props} />);

describe('CloudSpendSummary', () => {
  it('is one labelled panel with four tiles: spend, forecast, daily pace and CSP saving', () => {
    renderSummary();
    const summary = screen.getByRole('region', { name: 'Spend summary' });
    expect(within(summary).getAllByRole('article')).toHaveLength(4);
    for (const label of ['Month-to-date spend', 'Forecast', 'Daily pace', 'Maitsys CSP savings']) expect(within(summary).getByText(label)).toBeInTheDocument();
    expect(within(summary).queryByText('Amount Payable')).not.toBeInTheDocument();
  });

  it('shows the change against last month with its direction spoken and styled by direction (spend down is good)', () => {
    renderSummary();
    const hero = screen.getByText('Month-to-date spend').closest('article') as HTMLElement;
    expect(hero).toHaveTextContent('$14,280.55');
    const change = hero.querySelector('.mv-spend-change') as HTMLElement;
    expect(change).toHaveTextContent('Down2.4% vs last month');
    expect(change).toHaveClass('mv-spend-change--down');
    expect(within(hero).getByRole('img', { name: 'Spend per day this month' })).toBeInTheDocument();
    expect(hero).toHaveTextContent('Day 4 of 30');
  });

  it('flags spend that is up on last month in the danger direction', () => {
    renderSummary({ changePct: 8.25 });
    const change = document.querySelector('.mv-spend-change') as HTMLElement;
    expect(change).toHaveTextContent('Up8.3% vs last month');
    expect(change).toHaveClass('mv-spend-change--up');
  });

  it('labels the forecast as projected, says it is what will be payable, and compares it with last month', () => {
    renderSummary();
    const tile = screen.getByText('Forecast').closest('article') as HTMLElement;
    expect(within(tile).getByText('Projected')).toBeInTheDocument();
    expect(tile).toHaveTextContent('$15,867.28');
    expect(tile).toHaveTextContent('expected to be payable');
    expect(tile).toHaveTextContent('Up8.5% vs last month');
  });

  it('combines the daily average with today and whether today is above or below it', () => {
    const { unmount } = renderSummary();
    const tile = screen.getByText('Daily pace').closest('article') as HTMLElement;
    expect(tile).toHaveTextContent('$528.91');
    expect(tile).toHaveTextContent('Today $411.90');
    expect(tile).toHaveTextContent('22.1% below average');
    unmount();
    renderSummary({ todaySpend: 600 });
    expect(screen.getByText('Daily pace').closest('article')).toHaveTextContent('13.4% above average');
  });

  it('shows the saving with its rate and share of gross spend, and the counts as a quiet line of facts, not tiles', () => {
    renderSummary();
    const saving = screen.getByText('Maitsys CSP savings').closest('article') as HTMLElement;
    expect(saving).toHaveTextContent('$999.64');
    expect(saving).toHaveTextContent('7% CSP discount · 6.5% of gross spend');
    const facts = document.querySelector('.mv-spend-facts') as HTMLElement;
    expect(facts.tagName).toBe('DL');
    expect(facts).toHaveTextContent('Enabled services');
    expect(facts).toHaveTextContent('16 cost-tracked resources');
    expect(facts).toHaveTextContent('16 active');
  });

  it('for a past month: no forecast, no daily pace, and says why', () => {
    renderSummary({ isCurrentMonth: false, forecast: null, dailyAverage: null, todaySpend: null, changePct: null });
    expect(screen.getByText('Month spend')).toBeInTheDocument();
    expect(screen.getByText('Forecasts apply to the current month only.')).toBeInTheDocument();
    expect(screen.getByText('Shown for the current month.')).toBeInTheDocument();
    expect(screen.getByText('Forecast').closest('article')).toHaveTextContent('—');
    expect(screen.queryByText(/Day \d+ of/)).not.toBeInTheDocument();
  });

  it('copes with no forecast yet and no facts', () => {
    renderSummary({ forecast: 0, facts: [], lastMonthTotal: null });
    expect(screen.getByText('Not enough data for a projection yet.')).toBeInTheDocument();
    expect(document.querySelector('.mv-spend-facts')).not.toBeInTheDocument();
  });
});
