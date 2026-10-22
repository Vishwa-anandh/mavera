import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { workspaceRepository } from '../../../data-access';
import { ConfirmProvider } from '../../../shared/ui/ConfirmProvider';
import { BudgetsPage } from './BudgetsPage';

vi.mock('../../auth', () => ({
  useAuth: () => ({ user: { id: '1', email: 'a@b.com', role: 'admin' }, cloudAccess: ['azure', 'aws'], invoiceOnly: false }),
}));
// A new organisation has no spend yet, so there is nothing to suggest a limit from.
vi.mock('../../dashboard', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../dashboard')>();
  return { ...actual, useDashboardData: () => ({ summary: { data: { totals: {}, monthly: [] }, loading: false, error: null } }) };
});

describe('BudgetsPage for a brand-new organisation', () => {
  beforeEach(() => workspaceRepository.setProfile('empty'));
  afterEach(() => workspaceRepository.setProfile('populated'));

  it('says there are no budgets and offers one action that takes you to the create form', async () => {
    const user = userEvent.setup();
    const { container } = render(<MemoryRouter><ConfirmProvider><BudgetsPage /></ConfirmProvider></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'No Budgets Found' })).toBeInTheDocument();
    const first = screen.getByRole('button', { name: 'Create your first budget' });
    await user.click(first);
    expect(screen.getByLabelText('Budget Name')).toHaveFocus();
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });

  it('still suggests a name, but no limit because there is no spend to base one on', () => {
    render(<MemoryRouter><ConfirmProvider><BudgetsPage /></ConfirmProvider></MemoryRouter>);
    expect(screen.getByLabelText('Budget Name')).toHaveValue('Monthly cloud budget');
    expect(screen.queryByRole('button', { name: /^Use \$/ })).toBeNull();
    expect(screen.getByLabelText('Target Amount ($)')).toHaveAttribute('placeholder', '5000');
  });
});
