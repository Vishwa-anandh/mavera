import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { CloudIcon } from './icons';
import { ModuleCard } from './ModuleCard';

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname}{search}</p>;
}

const card = (onAction?: () => void) => render(
  <MemoryRouter>
    <ModuleCard title="Cloud Cost" icon={CloudIcon} subscribed actionLabel="Connect" actionPath="/azure?open=connect" onAction={onAction} />
    <Where />
  </MemoryRouter>,
);

describe('ModuleCard action', () => {
  it('is a link to the path', async () => {
    const user = userEvent.setup();
    card();
    expect(screen.getByRole('link', { name: 'Connect' })).toHaveAttribute('href', '/azure?open=connect');
    await user.click(screen.getByRole('link', { name: 'Connect' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/azure?open=connect');
  });

  it('with onAction, a plain click runs it instead of navigating, and the link still carries the path', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    card(onAction);
    expect(screen.getByRole('link', { name: 'Connect' })).toHaveAttribute('href', '/azure?open=connect');
    await user.click(screen.getByRole('link', { name: 'Connect' }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/$/);
  });
});
