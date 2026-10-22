import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { workspaceRepository } from '../../../data-access';
import { LastViewedAccount } from './LastViewedAccount';

const remember = (value: unknown) => sessionStorage.setItem('mv-remembered:accounts:last-viewed', JSON.stringify(value));
const renderTile = () => render(<MemoryRouter><LastViewedAccount /></MemoryRouter>);

describe('LastViewedAccount', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => {
    cleanup();
    act(() => workspaceRepository.setProfile('populated'));
  });

  it('shows nothing until an account has been opened', () => {
    const { container } = renderTile();
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ['azure', '/azure/a1'],
    ['aws', '/aws/account/a1'],
    ['gcp', '/gcp/account/a1'],
    ['btp', '/btp/account/a1'],
  ])('links the last viewed %s account straight to its page', (provider, path) => {
    remember({ provider, id: 'a1', name: 'Production' });
    renderTile();
    const link = screen.getByRole('link', { name: /Production/ });
    expect(link).toHaveAttribute('href', path);
    expect(link).toHaveTextContent('Last viewed account');
  });

  it('hides a new organisation account that has since been removed, and shows one that still exists', () => {
    workspaceRepository.setProfile('empty');
    const { id } = workspaceRepository.addConnectedAccount('azure', { name: 'Contoso', subscriptionId: 's', tenantId: 't', clientId: 'c' });
    remember({ provider: 'azure', id, name: 'Contoso' });
    const first = renderTile();
    expect(screen.getByRole('link', { name: /Contoso/ })).toHaveAttribute('href', `/azure/${id}`);
    first.unmount();
    workspaceRepository.removeAccount('azure', id);
    const { container } = renderTile();
    expect(container).toBeEmptyDOMElement();
  });
});
