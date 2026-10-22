import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AttentionPanel } from './AttentionPanel';
import type { AttentionItem } from '../model/attentionFeed';

const alertRow = (n: number): AttentionItem => ({ id: `r${n}`, module: 'cloud', tone: 'danger', title: `Spike ${n}`, detail: 'Cost anomaly', to: '/smart-alerts', alert: { kind: 'cloud', id: `a${n}` } });
const plainRow: AttentionItem = { id: 'budget', module: 'cloud', tone: 'warning', title: '85% of the monthly budget used', to: '/budgets' };
const panel = (items: AttentionItem[], onAct = vi.fn()) => <MemoryRouter><AttentionPanel items={items} subtitle="Across SAP and Cloud Cost, most urgent first." onAct={onAct} /></MemoryRouter>;
const renderPanel = (items: AttentionItem[], onAct = vi.fn()) => {
  render(panel(items, onAct));
  return onAct;
};

describe('AttentionPanel', () => {
  it('gives an alert row Resolve and Ignore beside its link, and no actions to a row that is not an alert', () => {
    renderPanel([alertRow(1), plainRow]);
    const rows = screen.getAllByRole('listitem');
    expect(within(rows[0]).getByRole('link', { name: /Spike 1/ })).toHaveAttribute('href', '/smart-alerts');
    expect(within(rows[0]).getByRole('button', { name: 'Resolve: Spike 1' })).toBeInTheDocument();
    expect(within(rows[0]).getByRole('button', { name: 'Ignore: Spike 1' })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('link', { name: /85% of the monthly budget/ })).toHaveAttribute('href', '/budgets');
    expect(within(rows[1]).queryByRole('button')).toBeNull();
  });

  it('gives every row the same columns: dot, text, an actions cell (empty when there are none) and the chevron', () => {
    renderPanel([alertRow(1), plainRow]);
    for (const row of screen.getAllByRole('listitem')) {
      expect(Array.from(row.children).map((child) => (child.getAttribute('class') ?? '').split(' ')[0])).toEqual(['mv-insight-dot', 'mv-attention-text', 'mv-attention-actions', 'mv-attention-chevron']);
    }
  });

  it('puts "Resolve all" and "All alerts" together in the header', () => {
    renderPanel([alertRow(1), alertRow(2)]);
    const header = screen.getByRole('heading', { name: 'Needs attention' }).closest('.mv-attention-header') as HTMLElement;
    const actions = header.querySelector('.mv-attention-header-actions') as HTMLElement;
    expect(within(actions).getAllByRole('button').concat(within(actions).getAllByRole('link')).map((el) => el.textContent)).toEqual(['Resolve all 2 alerts', 'All alerts']);
    expect(within(actions).getByRole('link', { name: 'All alerts' })).toHaveAttribute('href', '/alerts');
    expect(within(header).getByText('Across SAP and Cloud Cost, most urgent first.')).toBeInTheDocument();
  });

  it('resolves and ignores one row with a single click', async () => {
    const onAct = renderPanel([alertRow(1), alertRow(2)]);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Resolve: Spike 2' }));
    expect(onAct).toHaveBeenLastCalledWith([expect.objectContaining({ id: 'r2' })], 'resolve');
    await user.click(screen.getByRole('button', { name: 'Ignore: Spike 1' }));
    expect(onAct).toHaveBeenLastCalledWith([expect.objectContaining({ id: 'r1' })], 'ignore');
  });

  it('is operable from the keyboard: the buttons follow their row link in the tab order', async () => {
    const onAct = renderPanel([alertRow(1)]);
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByRole('link', { name: 'All alerts' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link', { name: /Spike 1/ })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Resolve: Spike 1' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Ignore: Spike 1' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onAct).toHaveBeenCalledWith([expect.objectContaining({ id: 'r1' })], 'ignore');
    // The acted-on row leaves the list, so focus is parked on the list rather than lost to the page.
    expect(screen.getByRole('list', { name: 'Items that need attention' })).toHaveFocus();
  });

  it('activates Resolve with the keyboard too', async () => {
    const onAct = renderPanel([alertRow(1)]);
    const user = userEvent.setup();
    screen.getByRole('button', { name: 'Resolve: Spike 1' }).focus();
    await user.keyboard(' ');
    expect(onAct).toHaveBeenCalledWith([expect.objectContaining({ id: 'r1' })], 'resolve');
  });

  it('offers Resolve all for the alert rows on show, and only when there is more than one', async () => {
    const { unmount } = render(panel([alertRow(1), plainRow]));
    expect(screen.queryByRole('button', { name: /Resolve all/ })).toBeNull();
    unmount();
    const onAct = renderPanel([alertRow(1), alertRow(2), plainRow]);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Resolve all 2 alerts' }));
    expect(onAct).toHaveBeenCalledWith([expect.objectContaining({ id: 'r1' }), expect.objectContaining({ id: 'r2' })], 'resolve');
  });

  it('shows six rows, then the rest on request, and Resolve all follows what is on show', async () => {
    const onAct = renderPanel(Array.from({ length: 8 }, (_, i) => alertRow(i + 1)));
    const user = userEvent.setup();
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByRole('button', { name: 'Resolve all 6 alerts' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show 2 more' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
    await user.click(screen.getByRole('button', { name: 'Resolve all 8 alerts' }));
    expect(onAct.mock.calls[0][0]).toHaveLength(8);
    await user.click(screen.getByRole('button', { name: 'Show fewer' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
  });

  it('says so when nothing needs attention, or shows the empty content the page gives it', () => {
    const { unmount } = render(panel([]));
    expect(screen.getByText('Nothing needs attention right now.')).toBeInTheDocument();
    unmount();
    render(<MemoryRouter><AttentionPanel items={[]} subtitle="x" empty={<p>Nothing matches these filters.</p>} /></MemoryRouter>);
    expect(screen.getByText('Nothing matches these filters.')).toBeInTheDocument();
    expect(screen.queryByText('Nothing needs attention right now.')).toBeNull();
  });
});
