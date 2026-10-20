import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CompanySignupPage } from './CompanySignupPage';
import { AuthProvider } from '../model/AuthContext';
import { licenseRepository, organizationRepository } from '../../../data-access';
import { SAMPLE_LICENSE_TOKENS } from '../../../demo/licenses/mockLicenses';

const PREMIUM = SAMPLE_LICENSE_TOKENS.premium;
const BASIC = SAMPLE_LICENSE_TOKENS.basic;
const PASSWORD = 'Str0ng!Passw0rd';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/company-signup']}>
      <AuthProvider>
        <Routes>
          <Route path="/company-signup" element={<CompanySignupPage />} />
          <Route path="/login" element={<h1>Sign in page</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

/** Pastes a 64-character token (typing it key by key would make these tests slow). */
async function enterToken(user: UserEvent, token: string) {
  await user.click(screen.getByLabelText('License token'));
  await user.paste(token);
}

const stepHeading = (name: string) => screen.findByRole('heading', { level: 2, name });

async function activate(user: UserEvent, token = PREMIUM) {
  await enterToken(user, token);
  await user.click(screen.getByRole('button', { name: 'Validate license' }));
  await stepHeading('Company details');
}

async function chooseOption(user: UserEvent, field: string, option: string) {
  await user.click(screen.getByLabelText(field));
  await user.click(screen.getByRole('option', { name: option }));
}

async function fillCompany(user: UserEvent, email = 'priya@contoso.com') {
  await user.type(screen.getByLabelText('Your full name'), 'Priya Raman');
  await user.type(screen.getByLabelText('Work email'), email);
  await chooseOption(user, 'Country', 'India');
}

async function submitCompany(user: UserEvent, email?: string) {
  await fillCompany(user, email);
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await stepHeading('Verify your email');
}

/** The sample code the prototype shows, read from the note on the Verify step. */
function shownCode() {
  return screen.getByText(/Your code is/).querySelector('code')!.textContent!;
}

async function verify(user: UserEvent) {
  await user.type(screen.getByLabelText('Verification code'), shownCode());
  await user.click(screen.getByRole('button', { name: 'Verify email' }));
  await stepHeading('Create your password');
}

async function finish(user: UserEvent) {
  await user.type(screen.getByLabelText('Password'), PASSWORD);
  await user.type(screen.getByLabelText('Confirm password'), PASSWORD);
  await user.click(screen.getByRole('button', { name: 'Create organisation' }));
  await stepHeading('Your organisation is ready');
}

describe('CompanySignupPage', () => {
  beforeEach(() => {
    localStorage.clear();
    licenseRepository.setLatency(0);
    licenseRepository.reset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens on the license step with a four-step progress list and the prototype sample tokens', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Set up your company' })).toBeInTheDocument();
    const steps = within(screen.getByRole('list', { name: 'Setup progress' })).getAllByRole('listitem');
    expect(steps.map((item) => item.textContent)).toEqual(['1License', '2Company', '3Verify', '4Password']);
    expect(steps[0]).toHaveAttribute('aria-current', 'step');
    expect(steps.slice(1).every((item) => !item.hasAttribute('aria-current'))).toBe(true);
    expect(screen.getByRole('heading', { level: 2, name: 'Activate license' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Back to sign in' })).toHaveLength(2);
    expect(screen.getByText('Powered by')).toBeInTheDocument();

    const note = screen.getByRole('region', { name: 'Prototype: sample license tokens' });
    expect(within(note).getAllByRole('listitem')).toHaveLength(2);
    expect(within(note).getByText('Premium, 25 seats')).toBeInTheDocument();
    expect(within(note).getByText('Basic, 5 seats')).toBeInTheDocument();
  });

  it('shows the token as a password field with a show and hide toggle', async () => {
    const user = userEvent.setup();
    renderPage();
    const field = screen.getByLabelText('License token');
    expect(field).toHaveAttribute('type', 'password');
    expect(field).toHaveAttribute('placeholder', 'Enter your 64-character token');
    await user.click(screen.getByRole('button', { name: 'Show token' }));
    expect(field).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide token' })).toBeInTheDocument();
  });

  it('copies a sample token and can fill it in', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Copy Premium, 25 seats sample token' }));
    await waitFor(async () => expect(await navigator.clipboard.readText()).toBe(PREMIUM));
    await user.click(screen.getByRole('button', { name: 'Use Basic, 5 seats sample token' }));
    expect(screen.getByLabelText('License token')).toHaveValue(BASIC);
  });

  it.each([
    ['', 'Enter your license token.'],
    ['abc123', 'Not a valid token.'],
    ['a'.repeat(64), 'Token not found.'],
    [SAMPLE_LICENSE_TOKENS.used, 'Token already used.'],
    [SAMPLE_LICENSE_TOKENS.expired, 'License expired on Jan 15, 2025.'],
  ])('explains a rejected token (%#)', async (token, message) => {
    const user = userEvent.setup();
    renderPage();
    if (token) await enterToken(user, token);
    await user.click(screen.getByRole('button', { name: 'Validate license' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(message);
    expect(screen.getByLabelText('License token')).toHaveAttribute('aria-invalid', 'true');
    // The guard: still on step 1, nothing after it is reachable.
    expect(screen.getByRole('heading', { level: 2, name: 'Activate license' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Work email')).not.toBeInTheDocument();
  });

  it('clears the token error as soon as the person edits the token', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Validate license' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await enterToken(user, 'a');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a busy state while the license is being checked', async () => {
    licenseRepository.setLatency(80);
    const user = userEvent.setup();
    renderPage();
    await enterToken(user, PREMIUM);
    await user.click(screen.getByRole('button', { name: 'Validate license' }));
    const busy = screen.getByRole('button', { name: 'Checking license…' });
    expect(busy).toBeDisabled();
    await stepHeading('Company details');
  });

  it('shows what the license grants and pre-fills the company name', async () => {
    const user = userEvent.setup();
    renderPage();
    await activate(user);

    const grant = screen.getByRole('region', { name: 'License verified' });
    expect(within(grant).getByText('Licensed to').nextSibling).toHaveTextContent('Contoso Industries');
    expect(within(grant).getByText('Plan').nextSibling).toHaveTextContent('Premium');
    expect(within(grant).getByText('Seats').nextSibling).toHaveTextContent('25 users');
    expect(within(grant).getByText('Modules').nextSibling).toHaveTextContent('Cloud Cost, SAP Monitoring');
    expect(screen.getByLabelText(/Company name/)).toHaveValue('Contoso Industries');
    const steps = screen.getAllByRole('listitem').filter((item) => item.closest('ol'));
    expect(steps[1]).toHaveAttribute('aria-current', 'step');
    expect(steps[0]).toHaveTextContent('(completed)');
  });

  it('validates the company details inline and keeps the person on the step', async () => {
    const user = userEvent.setup();
    renderPage();
    await activate(user);

    await user.clear(screen.getByLabelText(/Company name/));
    await user.type(screen.getByLabelText('Work email'), 'nope');
    await user.type(screen.getByLabelText(/Phone/), 'abc');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Enter your company name.')).toBeInTheDocument();
    expect(screen.getByText('Enter your full name.')).toBeInTheDocument();
    expect(screen.getByText(/Enter a valid work email address, like/)).toBeInTheDocument();
    expect(screen.getByText('Enter a valid phone number, or leave it empty.')).toBeInTheDocument();
    expect(screen.getByText('Choose your country.')).toBeInTheDocument();
    expect(screen.getByLabelText('Work email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('heading', { level: 2, name: 'Company details' })).toBeInTheDocument();
  });

  it('refuses an email that is already registered', async () => {
    const user = userEvent.setup();
    renderPage();
    await activate(user);
    await fillCompany(user, 'demo@mavera.local');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText(/already registered/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Company details' })).toBeInTheDocument();
  });

  it('goes back a step, keeps what was typed, and restarts when a different license is activated', async () => {
    const user = userEvent.setup();
    renderPage();
    await activate(user);
    await fillCompany(user);

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Activate license' })).toBeInTheDocument();
    expect(screen.getByLabelText('License token')).toHaveValue(PREMIUM);

    await user.click(screen.getByRole('button', { name: 'Validate license' }));
    await stepHeading('Company details');
    expect(screen.getByLabelText('Your full name')).toHaveValue('Priya Raman');

    await user.click(screen.getByRole('button', { name: 'Back' }));
    await user.clear(screen.getByLabelText('License token'));
    await enterToken(user, BASIC);
    await user.click(screen.getByRole('button', { name: 'Validate license' }));
    await stepHeading('Company details');
    expect(screen.getByLabelText('Your full name')).toHaveValue('');
    expect(screen.getByLabelText(/Company name/)).toHaveValue('Fabrikam Retail');
    expect(screen.getByText('Basic', { selector: 'dd' })).toBeInTheDocument();
  });

  it('sends a code to the work email, and Back from Verify returns to the company details', async () => {
    const user = userEvent.setup();
    renderPage();
    await activate(user);
    await submitCompany(user);

    expect(screen.getByText(/We emailed a 6-digit code to priya@contoso.com/)).toBeInTheDocument();
    expect(shownCode()).toMatch(/^\d{6}$/);
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Company details' })).toBeInTheDocument();
    expect(screen.getByLabelText('Work email')).toHaveValue('priya@contoso.com');
  });

  it('explains a missing, short or wrong verification code', async () => {
    const user = userEvent.setup();
    renderPage();
    await activate(user);
    await submitCompany(user);

    await user.click(screen.getByRole('button', { name: 'Verify email' }));
    expect(screen.getByText('Enter the 6-digit code we emailed you.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Verification code'), '12345');
    await user.click(screen.getByRole('button', { name: 'Verify email' }));
    expect(screen.getByText('The code is 6 digits. Check your email and try again.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Verification code'));
    const code = shownCode();
    await user.type(screen.getByLabelText('Verification code'), code === '000000' ? '111111' : '000000');
    await user.click(screen.getByRole('button', { name: 'Verify email' }));
    expect(await screen.findByText(/That code is not correct/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Verify your email' })).toBeInTheDocument();
  });

  it('counts down before a new code can be requested, then resends', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    renderPage();
    await activate(user);
    await submitCompany(user);

    expect(screen.getByRole('timer')).toHaveTextContent('Resend code in 0:30');
    expect(screen.queryByRole('button', { name: /Resend code/ })).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(12_000); });
    expect(screen.getByRole('timer')).toHaveTextContent('Resend code in 0:18');
    act(() => { vi.advanceTimersByTime(18_000); });
    await user.click(await screen.findByRole('button', { name: /Resend code/ }));
    expect(await screen.findByText('We sent a new code to priya@contoso.com.')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('Resend code in 0:30');
  });

  it('checks the password rules inline and shows a strength meter', async () => {
    const user = userEvent.setup();
    renderPage();
    await activate(user);
    await submitCompany(user);
    await verify(user);

    await user.type(screen.getByLabelText('Password'), 'short');
    expect(screen.getByText('Weak')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create organisation' }));
    expect(screen.getByText('Your password must be at least 8 characters.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Password'));
    await user.type(screen.getByLabelText('Password'), PASSWORD);
    expect(screen.getByText('Strong')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Confirm password'), 'Different1!');
    await user.click(screen.getByRole('button', { name: 'Create organisation' }));
    expect(screen.getByText('The two passwords do not match.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Create your password' })).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Show password' })[0]);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
  });

  it('runs all four steps, creates the organisation and marks the token used', async () => {
    const user = userEvent.setup();
    const before = organizationRepository.list().length;
    renderPage();

    await activate(user);
    await submitCompany(user);
    await verify(user);
    await finish(user);

    const steps = screen.getAllByRole('listitem').filter((item) => item.closest('ol'));
    expect(steps.every((item) => item.textContent?.includes('(completed)'))).toBe(true);
    expect(steps.some((item) => item.hasAttribute('aria-current'))).toBe(false);
    expect(screen.getByRole('status')).toHaveTextContent('Contoso Industries is set up.');
    expect(screen.getByRole('status')).toHaveTextContent('priya@contoso.com');

    expect(organizationRepository.list()).toHaveLength(before + 1);
    const org = organizationRepository.list().at(-1)!;
    expect(org).toMatchObject({ name: 'Contoso Industries', plan: 'premium', maxUsers: 25, modules: { cloudCost: true, sapMonitoring: true } });
    expect(await licenseRepository.validateToken(PREMIUM)).toMatchObject({ ok: false, reason: 'already-used' });
    expect(licenseRepository.authenticate('priya@contoso.com', PASSWORD)?.ok).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Continue to sign in' }));
    expect(screen.getByRole('heading', { name: 'Sign in page' })).toBeInTheDocument();
  });

  it('registers under an edited company name', async () => {
    const user = userEvent.setup();
    renderPage();
    await activate(user, BASIC);
    await user.clear(screen.getByLabelText(/Company name/));
    await user.type(screen.getByLabelText(/Company name/), 'Fabrikam Retail Ltd');
    await submitCompany(user, 'sam@fabrikam.com');
    await verify(user);
    await finish(user);
    expect(organizationRepository.list().at(-1)).toMatchObject({ name: 'Fabrikam Retail Ltd', plan: 'basic', maxUsers: 5, modules: { cloudCost: true, sapMonitoring: false } });
  });

  it('moves focus to the new step heading', async () => {
    const user = userEvent.setup();
    renderPage();
    await activate(user);
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Company details' })).toHaveFocus());
  });
});
