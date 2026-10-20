import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SuperAdminOrganizationsPage } from './SuperAdminOrganizationsPage';
import { SuperAdminOrganizationPage } from './SuperAdminOrganizationPage';
import { SuperAdminAuthProvider } from '../model/SuperAdminAuthContext';
import { ConfirmProvider } from '../../../shared/ui/ConfirmProvider';
import { SA_TOKEN_KEY, SA_USERNAME_KEY, LICENSE_TOKEN_PATTERN, licenseRepository, organizationRepository } from '../../../data-access';
import { SAMPLE_LICENSE_TOKENS } from '../../../demo/licenses/mockLicenses';

function renderPortal(path: string) {
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

describe('Super Admin license tokens', () => {
  beforeEach(() => {
    localStorage.clear();
    licenseRepository.setLatency(0);
    licenseRepository.reset();
  });

  it('shows an existing organization\'s license token with a copy button', async () => {
    const user = userEvent.setup();
    renderPortal('/admin/organizations/org-acme');
    const token = screen.getByLabelText('License token');
    expect(token.textContent).toMatch(LICENSE_TOKEN_PATTERN);
    await user.click(screen.getByRole('button', { name: 'Copy license token' }));
    expect(await navigator.clipboard.readText()).toBe(token.textContent);
    expect(screen.queryByRole('button', { name: /Generate/ })).not.toBeInTheDocument();
  });

  it('generates a token while creating an organization and keeps it with the new organization', async () => {
    const user = userEvent.setup();
    renderPortal('/admin/organizations/new');

    expect(screen.getByText('No token generated yet.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Generate token' }));
    const first = screen.getByLabelText('License token').textContent!;
    expect(first).toMatch(LICENSE_TOKEN_PATTERN);
    await user.click(screen.getByRole('button', { name: 'Generate a new token' }));
    const second = screen.getByLabelText('License token').textContent!;
    expect(second).not.toBe(first);

    await user.type(screen.getByLabelText('Organization name'), 'Stark Industries');
    await user.click(screen.getByRole('button', { name: 'Create organization' }));
    expect(within(rowFor('Stark Industries')).getByText('0 members')).toBeInTheDocument();

    const org = organizationRepository.list().find((o) => o.name === 'Stark Industries')!;
    expect(licenseRepository.getTokenForOrganization(org.id)).toBe(second);
    expect(await licenseRepository.validateToken(second)).toMatchObject({ ok: false, reason: 'already-used' });
  });

  it('lists a self-registered company as Active with its plan, seats and modules', async () => {
    await licenseRepository.startSignup({ token: SAMPLE_LICENSE_TOKENS.premium, companyName: 'Contoso Industries', adminName: 'Priya Raman', email: 'priya@contoso.com', country: 'India' });
    await licenseRepository.sendVerificationCode('priya@contoso.com');
    await licenseRepository.verifyVerificationCode('priya@contoso.com', licenseRepository.peekVerificationCode('priya@contoso.com')!);
    const company = await licenseRepository.completeSignup('priya@contoso.com', 'Str0ng!Passw0rd');

    const user = userEvent.setup();
    renderPortal('/admin/organizations');
    const row = rowFor('Contoso Industries');
    expect(within(row).getByText('Premium plan · Active')).toBeInTheDocument();
    expect(within(row).getByText('25 seats')).toBeInTheDocument();
    expect(within(row).getByText('Cloud Cost')).toBeInTheDocument();
    expect(within(row).getByText('SAP Monitoring')).toBeInTheDocument();

    await user.click(within(row).getByRole('link', { name: 'Manage Contoso Industries' }));
    expect(screen.getByText(/Premium plan/)).toBeInTheDocument();
    expect(screen.getByLabelText('License token').textContent).toBe(SAMPLE_LICENSE_TOKENS.premium);
    expect(company.organizationId).toBe('org-contoso-industries');
  });
});
