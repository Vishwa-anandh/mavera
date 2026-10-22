import { beforeEach, describe, expect, it } from 'vitest';
import { render, renderHook, screen } from '@testing-library/react';
import { useLastViewedAccount, useRememberLastViewedAccount } from './lastViewedAccount';

function Reader() {
  const last = useLastViewedAccount();
  return <p data-testid="last">{last ? `${last.provider}:${last.id}:${last.name}` : 'none'}</p>;
}

describe('last viewed account', () => {
  beforeEach(() => sessionStorage.clear());

  it('is empty until an account page has been opened', () => {
    render(<Reader />);
    expect(screen.getByTestId('last')).toHaveTextContent('none');
  });

  it('remembers the account an account page loaded, for the next page to read', () => {
    renderHook(() => useRememberLastViewedAccount('azure', { id: 'a1', name: 'Production' }));
    render(<Reader />);
    expect(screen.getByTestId('last')).toHaveTextContent('azure:a1:Production');
  });

  it('keeps only the latest account, across providers', () => {
    renderHook(() => useRememberLastViewedAccount('azure', { id: 'a1', name: 'Production' }));
    renderHook(() => useRememberLastViewedAccount('aws', { id: 'w9', name: 'Maitsys-AWS' }));
    render(<Reader />);
    expect(screen.getByTestId('last')).toHaveTextContent('aws:w9:Maitsys-AWS');
  });

  it('remembers nothing while the account is unknown (not loaded, or no longer connected)', () => {
    renderHook(() => useRememberLastViewedAccount('gcp', undefined));
    render(<Reader />);
    expect(screen.getByTestId('last')).toHaveTextContent('none');
  });

  it('ignores a stored value that is not an account', () => {
    sessionStorage.setItem('mv-remembered:accounts:last-viewed', JSON.stringify({ provider: 'oracle', id: 'x', name: 'y' }));
    render(<Reader />);
    expect(screen.getByTestId('last')).toHaveTextContent('none');
  });
});
