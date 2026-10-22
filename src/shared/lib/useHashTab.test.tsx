import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useHashTab } from './useHashTab';

const TABS = ['one', 'two', 'three'] as const;

function Harness() {
  const [tab, setTab] = useHashTab(TABS);
  const { hash, search } = useLocation();
  return (
    <div>
      <p data-testid="tab">{tab}</p>
      <p data-testid="hash">{hash}</p>
      <p data-testid="search">{search}</p>
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

  it('keeps the query (filters) when it switches tab', async () => {
    renderAt('/page?status=resolved');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Go to three' }));
    expect(screen.getByTestId('search')).toHaveTextContent('?status=resolved');
    expect(screen.getByTestId('hash')).toHaveTextContent('#three');
  });

  it('writes the chosen tab to the hash', async () => {
    renderAt('/page');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Go to three' }));
    expect(screen.getByTestId('tab')).toHaveTextContent('three');
    expect(screen.getByTestId('hash')).toHaveTextContent('#three');
  });
});

function RememberingHarness({ remember }: { remember: string }) {
  const [tab, setTab] = useHashTab(TABS, TABS[0], { remember });
  return (
    <div>
      <p data-testid="tab">{tab}</p>
      <button onClick={() => setTab('two')}>Go to two</button>
    </div>
  );
}

describe('useHashTab with remember', () => {
  beforeEach(() => sessionStorage.clear());

  it('reopens the tab last used when the URL has no hash', async () => {
    const first = render(<MemoryRouter initialEntries={['/page']}><RememberingHarness remember="demo" /></MemoryRouter>);
    expect(screen.getByTestId('tab')).toHaveTextContent('one');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Go to two' }));
    first.unmount();
    render(<MemoryRouter initialEntries={['/page']}><RememberingHarness remember="demo" /></MemoryRouter>);
    expect(screen.getByTestId('tab')).toHaveTextContent('two');
  });

  it('lets a hash in the URL win over the remembered tab', () => {
    sessionStorage.setItem('mv-remembered:tab:demo', 'two');
    render(<MemoryRouter initialEntries={['/page#three']}><RememberingHarness remember="demo" /></MemoryRouter>);
    expect(screen.getByTestId('tab')).toHaveTextContent('three');
  });

  it('keeps each key separate and ignores a remembered tab that no longer exists', () => {
    sessionStorage.setItem('mv-remembered:tab:other', 'three');
    sessionStorage.setItem('mv-remembered:tab:demo', 'gone');
    render(<MemoryRouter initialEntries={['/page']}><RememberingHarness remember="demo" /></MemoryRouter>);
    expect(screen.getByTestId('tab')).toHaveTextContent('one');
  });
});
