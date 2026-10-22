import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useUrlFilter } from './useUrlFilter';

const VIEWS = ['active', 'resolved', 'ignored'] as const;
const TYPES = ['all', 'spike', 'budget'] as const;

function Harness() {
  const [view, setView] = useUrlFilter('status', VIEWS, 'active');
  const [type, setType] = useUrlFilter('type', TYPES, 'all');
  const { search, hash } = useLocation();
  return (
    <div>
      <p data-testid="view">{view}</p>
      <p data-testid="type">{type}</p>
      <p data-testid="url">{search}{hash}</p>
      <button onClick={() => setView('resolved')}>Resolved</button>
      <button onClick={() => setView('active')}>Active</button>
      <button onClick={() => setType('budget')}>Budget</button>
      <button onClick={() => { setView('active'); setType('all'); }}>Clear both</button>
    </div>
  );
}

const renderAt = (url: string) => render(<MemoryRouter initialEntries={[url]}><Harness /></MemoryRouter>);

describe('useUrlFilter', () => {
  it('uses the fallback when the query has no value or an unknown one', () => {
    renderAt('/alerts?status=bogus');
    expect(screen.getByTestId('view')).toHaveTextContent('active');
    expect(screen.getByTestId('type')).toHaveTextContent('all');
  });

  it('reads the filters from the query', () => {
    renderAt('/alerts?status=ignored&type=spike');
    expect(screen.getByTestId('view')).toHaveTextContent('ignored');
    expect(screen.getByTestId('type')).toHaveTextContent('spike');
  });

  it('writes a changed filter to the query, keeps the other filters and the tab hash, and drops a filter set back to its fallback', async () => {
    const user = userEvent.setup();
    renderAt('/alerts#alerts');
    await user.click(screen.getByRole('button', { name: 'Resolved' }));
    await user.click(screen.getByRole('button', { name: 'Budget' }));
    expect(screen.getByTestId('url')).toHaveTextContent('?status=resolved&type=budget#alerts');
    await user.click(screen.getByRole('button', { name: 'Active' }));
    expect(screen.getByTestId('url')).toHaveTextContent('?type=budget#alerts');
    expect(screen.getByTestId('view')).toHaveTextContent('active');
  });

  it('applies several filters changed in the same click', async () => {
    const user = userEvent.setup();
    renderAt('/alerts?status=ignored&type=spike#alerts');
    await user.click(screen.getByRole('button', { name: 'Clear both' }));
    expect(screen.getByTestId('view')).toHaveTextContent('active');
    expect(screen.getByTestId('type')).toHaveTextContent('all');
    expect(screen.getByTestId('url')).toHaveTextContent(/^#alerts$/);
  });
});
