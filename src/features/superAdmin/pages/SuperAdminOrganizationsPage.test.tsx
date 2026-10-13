import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SuperAdminOrganizationsPage } from './SuperAdminOrganizationsPage';
import { SuperAdminOrganizationPage } from './SuperAdminOrganizationPage';
import { SuperAdminAuthProvider } from '../model/SuperAdminAuthContext';
import { resetOrganizations } from '../model/organizationsStore';
import { ConfirmProvider } from '../../../shared/ui/ConfirmProvider';
import { SA_TOKEN_KEY, SA_USERNAME_KEY } from '../../../data-access';

function renderPortal(path = '/admin/organizations') {
  localStorage.setItem(SA_TOKEN_KEY, 'demo-super-admin-token');
  localStorage.setItem(SA_USERNAME_KEY, 'superadmin');
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ConfirmProvider>
        <SuperAdminAuthProvider>
          <Routes>
            <Route path="/admin/organizations" element={<SuperAdminOrganizationsPage />} />
            <Route path="/admin/organizations/new" element={<SuperAdminOrganizationPage />} />
            <Route path="/admin/organizations/:orgId" element={<SuperAdminOrganizationPage />} />
          </Routes>
        </SuperAdminAuthProvider>
      </ConfirmProvider>
    </MemoryRouter>,
  );
}

const rowFor = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;

describe('Super Admin organizations', () => {
  beforeEach(() => {
    localStorage.clear();
    resetOrganizations();
  });

  it('lists every mock organization with its seat limit and module dots', () => {
    renderPortal();
    expect(screen.getByText('Acme Industrial Group')).toBeInTheDocument();
    expect(screen.getByText('Unlimited')).toBeInTheDocument();
    expect(screen.getByText('25 seats')).toBeInTheDocument();
  });

  it('opens Manage as its own page, and saving a module change returns to the updated list', async () => {
    const user = userEvent.setup();
    renderPortal();

    await user.click(within(rowFor('Northwind Logistics')).getByRole('link', { name: 'Manage Northwind Logistics' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Northwind Logistics' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();

    const idocCheckbox = screen.getByRole('checkbox', { name: /IDoc Monitoring/ });
    expect(idocCheckbox).toBeChecked();
    await user.click(idocCheckbox);
    expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Organizations' })).toBeInTheDocument();
    expect(within(rowFor('Northwind Logistics')).getByLabelText('IDoc Monitoring')).not.toHaveClass('mv-sa-module-dot--on');
  });

  it("changes an org's seat limit from its page", async () => {
    const user = userEvent.setup();
    renderPortal('/admin/organizations/org-globex');

    await user.click(screen.getByLabelText('Max users'));
    await user.click(screen.getByRole('option', { name: '50 users' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(within(rowFor('Globex Manufacturing')).getByText('50 seats')).toBeInTheDocument();
  });

  it('extends a subscription by a year from its page', async () => {
    const user = userEvent.setup();
    renderPortal('/admin/organizations/org-northwind');

    const expires = screen.getByLabelText('Expires') as HTMLInputElement;
    const before = expires.value;
    await user.click(screen.getByRole('button', { name: '1 year' }));
    expect(expires.value > before).toBe(true);
  });

  it('asks before discarding unsaved changes on Cancel', async () => {
    const user = userEvent.setup();
    renderPortal('/admin/organizations/org-northwind');

    await user.click(screen.getByRole('checkbox', { name: /SAP Monitoring/ }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('alertdialog', { name: 'Discard your changes?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Northwind Logistics' })).toBeInTheDocument();
  });

  it('creates a new organization from its own page', async () => {
    const user = userEvent.setup();
    renderPortal();

    await user.click(screen.getByRole('link', { name: 'New organization' }));
    expect(screen.getByRole('heading', { level: 1, name: 'New organization' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create organization' }));
    expect(screen.getByText('Organization name is required.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Organization name'), 'Stark Industries');
    await user.click(screen.getByRole('checkbox', { name: /Cloud Cost/ }));
    await user.click(screen.getByLabelText('Max users'));
    await user.click(screen.getByRole('option', { name: '25 users' }));
    await user.click(screen.getByRole('button', { name: 'Create organization' }));

    const newRow = rowFor('Stark Industries');
    expect(within(newRow).getByText('0 members')).toBeInTheDocument();
    expect(within(newRow).getByText('25 seats')).toBeInTheDocument();
    expect(within(newRow).getByLabelText('Cloud Cost')).toHaveClass('mv-sa-module-dot--on');
  });

  it('shows a clear not-found state for an unknown organization', () => {
    renderPortal('/admin/organizations/org-missing');
    expect(screen.getByRole('heading', { name: 'Organization not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to organizations' })).toHaveAttribute('href', '/admin/organizations');
  });
});
