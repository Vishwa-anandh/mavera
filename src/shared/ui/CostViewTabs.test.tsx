import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { costViewPanelProps, useCostView } from '../lib/useCostView';
import { CostViewTabs } from './CostViewTabs';

const VIEWS = ['executive', 'operations', 'technical'] as const;

function Page({ provider = 'azure' }: { provider?: string }) {
  const { pathname } = useLocation();
  const accountId = pathname.split('/').pop();
  const [view, setView] = useCostView(provider, accountId, VIEWS);
  return (
    <div>
      <CostViewTabs views={VIEWS} active={view} onChange={setView} />
      <div {...costViewPanelProps(view)}>{view} content</div>
    </div>
  );
}

const renderAt = (url: string) => render(<MemoryRouter initialEntries={[url]}><Routes><Route path="/azure/:id" element={<Page />} /></Routes></MemoryRouter>);

beforeEach(() => sessionStorage.clear());

describe('CostViewTabs', () => {
  it('shows the views as tabs, with who each one is for, Executive first', () => {
    renderAt('/azure/a1');
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.firstChild?.textContent)).toEqual(['Executive', 'Operations', 'Technical']);
    expect(tabs[0]).toHaveTextContent('CEO / Leadership');
    expect(screen.getByRole('tablist', { name: 'Cost view' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Executive/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('executive content');
  });

  it('opens the view named in the URL hash and ties the panel to its tab', () => {
    renderAt('/azure/a1#technical');
    expect(screen.getByRole('tab', { name: /Technical/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: /Technical/ })).toHaveTextContent('technical content');
  });

  it('remembers the view per account: back on the same account it reopens, another account starts on Executive', async () => {
    const user = userEvent.setup();
    const first = renderAt('/azure/a1');
    await user.click(screen.getByRole('tab', { name: /Operations/ }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('operations content');
    first.unmount();

    const again = renderAt('/azure/a1');
    expect(screen.getByRole('tab', { name: /Operations/ })).toHaveAttribute('aria-selected', 'true');
    again.unmount();

    renderAt('/azure/a2');
    expect(screen.getByRole('tab', { name: /Executive/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('moves between views with the arrow keys', async () => {
    const user = userEvent.setup();
    renderAt('/azure/a1');
    screen.getByRole('tab', { name: /Executive/ }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Operations/ })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('operations content');
  });
});
