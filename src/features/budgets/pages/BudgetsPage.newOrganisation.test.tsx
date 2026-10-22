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
});
