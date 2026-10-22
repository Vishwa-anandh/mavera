import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, useState } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { openOnArrivalTarget, requestsOpen, useOpenOnArrival } from './useOpenOnArrival';

function Page({ onOpen, enabled, consume }: { onOpen: () => void; enabled?: boolean; consume?: boolean }) {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  useOpenOnArrival('new', onOpen, { enabled, consume });
  return (
    <div>
      <p data-testid="url">{`${pathname}${search}${hash}`}</p>
      <button onClick={() => navigate('/page?open=new')}>Ask again</button>
    </div>
  );
}

const renderAt = (url: string, props: Partial<Parameters<typeof Page>[0]> = {}, strict = false) => {
  const onOpen = vi.fn();
  const tree = <MemoryRouter initialEntries={[url]}><Page onOpen={onOpen} {...props} /></MemoryRouter>;
  render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  return onOpen;
};

describe('requestsOpen', () => {
  it('reads the open query parameter or a matching hash', () => {
    expect(requestsOpen({ search: '?open=new', hash: '' }, 'new')).toBe(true);
    expect(requestsOpen({ search: '', hash: '#new' }, 'new')).toBe(true);
    expect(requestsOpen({ search: '?open=other', hash: '' }, 'new')).toBe(false);
    expect(requestsOpen({ search: '', hash: '' }, 'new')).toBe(false);
  });

  it('builds a target that keeps a tab hash separate from the request', () => {
    expect(openOnArrivalTarget('/budgets', 'add-channel', '#integrations')).toEqual({ pathname: '/budgets', search: '?open=add-channel', hash: '#integrations' });
  });
});

describe('useOpenOnArrival', () => {
  it('does nothing when the page is reached without a request', () => {
    const onOpen = renderAt('/page');
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('opens once on arrival and takes the request out of the URL', async () => {
    const onOpen = renderAt('/page?open=new&view=all#tab');
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('/page?view=all#tab'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('opens once even under StrictMode double effects', async () => {
    const onOpen = renderAt('/page?open=new', {}, true);
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent(/^\/page$/));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('accepts a bare hash and clears it', async () => {
    const onOpen = renderAt('/page#new');
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent(/^\/page$/));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('opens again for a fresh request on the page that is already showing', async () => {
    const onOpen = renderAt('/page?open=new');
    await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(1));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ask again' }));
    await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(2));
  });

  it('waits until enabled before opening', async () => {
    function Gate() {
      const [ready, setReady] = useState(false);
      const [opened, setOpened] = useState(false);
      useOpenOnArrival('new', () => setOpened(true), { enabled: ready });
      return (
        <div>
          <p data-testid="opened">{String(opened)}</p>
          <button onClick={() => setReady(true)}>Ready</button>
        </div>
      );
    }
    render(<MemoryRouter initialEntries={['/page?open=new']}><Gate /></MemoryRouter>);
    expect(screen.getByTestId('opened')).toHaveTextContent('false');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ready' }));
    expect(screen.getByTestId('opened')).toHaveTextContent('true');
  });

  it('leaves the request in place when consume is off', async () => {
    const onOpen = renderAt('/page?open=new', { consume: false });
    await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('url')).toHaveTextContent('/page?open=new');
  });
});
