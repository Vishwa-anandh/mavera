import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useHashTab } from './useHashTab';

const TABS = ['one', 'two', 'three'] as const;

function Harness() {
  const [tab, setTab] = useHashTab(TABS);
  const { hash } = useLocation();
  return (
    <div>
      <p data-testid="tab">{tab}</p>
      <p data-testid="hash">{hash}</p>
      <button onClick={() => setTab('three')}>Go to three</button>
    </div>
  );
}

const renderAt = (url: string) => render(<MemoryRouter initialEntries={[url]}><Harness /></MemoryRouter>);

describe('useHashTab', () => {
  it('defaults to the first tab when there is no hash', () => {
    renderAt('/page');
    expect(screen.getByTestId('tab')).toHaveTextContent('one');
  });

  it('reads the tab from the hash', () => {
    renderAt('/page#two');
    expect(screen.getByTestId('tab')).toHaveTextContent('two');
  });

  it('ignores a hash that is not one of the tabs', () => {
    renderAt('/page#unknown');
    expect(screen.getByTestId('tab')).toHaveTextContent('one');
  });

  it('writes the chosen tab to the hash', async () => {
    renderAt('/page');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Go to three' }));
    expect(screen.getByTestId('tab')).toHaveTextContent('three');
    expect(screen.getByTestId('hash')).toHaveTextContent('#three');
  });
});
