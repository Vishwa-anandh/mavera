import { useEffect, useMemo, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { licenseRepository, type LicenseValidation, type RegisteredCompany } from '../../../data-access';
import { useAuth } from '../model/AuthContext';
import { SignupStepper } from '../components/SignupStepper';
import {
  COMPANY_SIZES, COUNTRIES, EMAIL_PATTERN, PHONE_PATTERN, RESEND_SECONDS,
  formatCountdown, formatDay, formatPlan, formatSeats, shortenToken,
} from '../model/companySignup';
import { LoginBackdrop } from '../components/LoginBackdrop';
import { PasswordField } from '../../../shared/ui/PasswordField';
import { PasswordStrengthMeter } from '../../../shared/ui/PasswordStrengthMeter';
import { CopyButton } from '../../../shared/ui/CopyButton';
import { Select } from '../../../shared/ui/Select';
import { BellIcon, ChevronLeftIcon, CheckIcon, CloudIcon, LockIcon, MailIcon, ServerIcon, ShieldIcon } from '../../../shared/ui/icons';
import maveraLogo from '../../../../assets/brand/mavera-logo.png';
import maitsysLogo from '../../../../assets/brand/maitsys.png';

type ValidLicense = Extract<LicenseValidation, { ok: true }>['license'];

interface Details {
  companyName: string;
  adminName: string;
  email: string;
  phone: string;
  country: string;
  companySize: string;
}

type ErrorKey = 'token' | 'companyName' | 'adminName' | 'email' | 'phone' | 'country' | 'code' | 'password' | 'confirm' | 'form';
type Errors = Partial<Record<ErrorKey, string>>;

const FIELD_IDS: Record<Exclude<ErrorKey, 'form'>, string> = {
  token: 'cs-token', companyName: 'cs-company', adminName: 'cs-name', email: 'cs-email', phone: 'cs-phone',
  country: 'cs-country', code: 'cs-code', password: 'cs-password', confirm: 'cs-confirm',
};

const EMPTY_DETAILS: Details = { companyName: '', adminName: '', email: '', phone: '', country: '', companySize: '' };

const OFFER = [
  { icon: ServerIcon, tag: 'Protect', title: 'SAP and HANA monitoring', body: 'System health, jobs, dumps, security notes and HANA vitals in one place.' },
  { icon: CloudIcon, tag: 'Optimize', title: 'Cloud cost monitoring', body: 'Spend across Azure, AWS, Google Cloud and SAP BTP, with budgets and savings to act on.' },
  { icon: BellIcon, tag: 'Protect', title: 'Smart alerts', body: 'Thresholds and anomaly alerts reach the right person before a bill or an outage does.' },
  { icon: ShieldIcon, tag: 'Govern', title: 'Role-based access', body: 'Invite your team with the permissions each person needs, and see every change.' },
] as const;

const PROVIDER_LABELS = { azure: 'Azure', aws: 'AWS', btp: 'SAP BTP', gcp: 'Google Cloud' } as const;

function apiMessage(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { error?: string } } }).response?.data?.error ?? fallback;
}

function moduleNames(modules: { cloudCost: boolean; sapMonitoring: boolean }): string {
  const names = [modules.cloudCost && 'Cloud Cost', modules.sapMonitoring && 'SAP Monitoring'].filter(Boolean);
  return names.length ? names.join(', ') : 'None';
}

function focusField(key: ErrorKey) {
  if (key === 'form') return;
  document.getElementById(FIELD_IDS[key])?.focus();
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  help?: ReactNode;
}

function TextField({ id, label, optional, error, help, ...input }: TextFieldProps) {
  const describedBy = [error ? `${id}-error` : null, help ? `${id}-help` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="mv-cs-field">
      <label className="mv-field">
        <span>{label}{optional && <span className="mv-cs-optional"> (optional)</span>}</span>
        <input id={id} {...input} aria-invalid={error ? true : undefined} aria-describedby={describedBy} />
      </label>
      {help && !error && <span id={`${id}-help`} className="mv-field-help">{help}</span>}
      {error && <span id={`${id}-error`} className="mv-field-error" role="alert">{error}</span>}
    </div>
  );
}

function LicenseSummary({ license, titleId, verified = true }: { license: Pick<ValidLicense, 'organizationName' | 'plan' | 'seats' | 'modules' | 'cloudAccess' | 'expiresAt'>; titleId: string; verified?: boolean }) {
  const rows: Array<[string, string]> = [
    ['Licensed to', license.organizationName],
    ['Plan', formatPlan(license.plan)],
    ['Seats', formatSeats(license.seats)],
    ['Modules', moduleNames(license.modules)],
    ['Cloud access', license.cloudAccess.length ? license.cloudAccess.map((provider) => PROVIDER_LABELS[provider]).join(', ') : 'None'],
    ['Expires', formatDay(license.expiresAt)],
  ];
  return (
    <section className="mv-cs-license" aria-labelledby={titleId}>
      <h3 id={titleId}>{verified ? <><CheckIcon size={14} aria-hidden /> License verified</> : 'Your license'}</h3>
      <dl>
        {rows.map(([term, value]) => (
          <div key={term}><dt>{term}</dt><dd>{value}</dd></div>
        ))}
      </dl>
    </section>
  );
}

/**
 * Register company (/company-signup): a business activates a license token a Maitsys super admin
 * issued, tells Mavera about the company, verifies its email and chooses a password. The steps
 * cannot be skipped: each one is reachable only once the one before it has succeeded. Everything
 * the flow needs from a server (validating the token, saving the sign-up, creating the
 * organisation) goes through the license repository, which is simulated in memory for the
 * prototype; the emailed code goes through the existing sendOtp / verifyOtp.
 */
export function CompanySignupPage() {
  const navigate = useNavigate();
  const { sendOtp, verifyOtp } = useAuth();

  const [step, setStep] = useState(0);
  const [done, setDone] = useState<RegisteredCompany | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const [token, setToken] = useState('');
  const [license, setLicense] = useState<ValidLicense | null>(null);
  const [details, setDetails] = useState<Details>(EMPTY_DETAILS);
  const [signupEmail, setSignupEmail] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [prototypeCode, setPrototypeCode] = useState<string | undefined>();
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [resendNote, setResendNote] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const mounted = useRef(false);
  const samples = useMemo(() => licenseRepository.listSampleTokens(), []);

  // Step guard: a step is reachable only after the one before it succeeded.
  const furthest = !license ? 0 : !signupEmail ? 1 : verifiedEmail !== signupEmail ? 2 : 3;
  const current = Math.min(step, furthest);

  // Move focus to the new step's heading, but not on first load (the token field has autofocus).
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    headingRef.current?.focus();
  }, [current, done]);

  const secondsLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));
  useEffect(() => {
    if (current !== 2 || resendAt <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [current, resendAt]);

  const fail = (next: Errors) => {
    setErrors(next);
    const first = (Object.keys(next) as ErrorKey[])[0];
    if (first) setTimeout(() => focusField(first), 0);
  };
  const clearError = (key: ErrorKey) => setErrors((existing) => (existing[key] || existing.form ? { ...existing, [key]: undefined, form: undefined } : existing));
  const goBack = () => { setErrors({}); setResendNote(null); setStep(Math.max(0, current - 1)); };
  const setDetail = (key: keyof Details) => (value: string) => { setDetails((existing) => ({ ...existing, [key]: value })); clearError(key as ErrorKey); };

  const sendCode = async (email: string) => {
    await sendOtp(email);
    setPrototypeCode(licenseRepository.peekVerificationCode(email));
    setResendAt(Date.now() + RESEND_SECONDS * 1000);
    setNow(Date.now());
  };

  const validateLicense = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const value = token.trim();
    if (!value) return fail({ token: 'Enter your license token.' });
    setBusy(true);
    setErrors({});
    try {
      const result = await licenseRepository.validateToken(value);
      if (!result.ok) return fail({ token: result.message });
      if (license?.token !== result.license.token) {
        // A different license starts the sign-up over, pre-filling the company name from the license.
        setDetails({ ...EMPTY_DETAILS, companyName: result.license.organizationName });
        setSignupEmail(null);
        setVerifiedEmail(null);
        setCode('');
      }
      setLicense(result.license);
      setStep(1);
    } catch {
      fail({ token: 'We could not check the license right now. Try again in a moment.' });
    } finally {
      setBusy(false);
    }
  };

  const submitCompany = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !license) return;
    const next: Errors = {};
    if (!details.companyName.trim()) next.companyName = 'Enter your company name.';
    if (!details.adminName.trim()) next.adminName = 'Enter your full name.';
    if (!details.email.trim()) next.email = 'Enter your work email address.';
    else if (!EMAIL_PATTERN.test(details.email.trim())) next.email = 'Enter a valid work email address, like name@company.com.';
    if (details.phone.trim() && !PHONE_PATTERN.test(details.phone.trim())) next.phone = 'Enter a valid phone number, or leave it empty.';
    if (!details.country) next.country = 'Choose your country.';
    if (Object.keys(next).length) return fail(next);
    setBusy(true);
    setErrors({});
    try {
      const saved = await licenseRepository.startSignup({
        token: license.token,
        companyName: details.companyName.trim(),
        adminName: details.adminName.trim(),
        email: details.email.trim(),
        phone: details.phone.trim() || undefined,
        country: details.country,
        companySize: details.companySize || undefined,
      });
      if (!saved.ok) {
        if (saved.field === 'token') {
          setLicense(null);
          setStep(0);
          return fail({ token: saved.message });
        }
        return fail({ [saved.field ?? 'form']: saved.message });
      }
      await sendCode(details.email.trim());
      setSignupEmail(details.email.trim());
      setVerifiedEmail(null);
      setCode('');
      setResendNote(null);
      setStep(2);
    } catch (error) {
      fail({ form: apiMessage(error, 'We could not save your details or send the code. Try again.') });
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !signupEmail) return;
    if (verifiedEmail === signupEmail) { setStep(3); return; }
    const value = code.trim();
    if (!value) return fail({ code: 'Enter the 6-digit code we emailed you.' });
    if (!/^\d{6}$/.test(value)) return fail({ code: 'The code is 6 digits. Check your email and try again.' });
    setBusy(true);
    setErrors({});
    try {
      await verifyOtp(signupEmail, value);
      setVerifiedEmail(signupEmail);
      setStep(3);
    } catch (error) {
      fail({ code: apiMessage(error, 'That code is not valid or has expired. Request a new one.') });
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (busy || secondsLeft > 0 || !signupEmail) return;
    setBusy(true);
    setErrors({});
    try {
      await sendCode(signupEmail);
      setCode('');
      setResendNote(`We sent a new code to ${signupEmail}.`);
    } catch (error) {
      fail({ form: apiMessage(error, 'We could not send a new code. Try again.') });
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !signupEmail) return;
    if (password.length < 8) return fail({ password: 'Your password must be at least 8 characters.' });
    if (confirm !== password) return fail({ confirm: 'The two passwords do not match.' });
    setBusy(true);
    setErrors({});
    try {
      const company = await licenseRepository.completeSignup(signupEmail, password);
      setPassword('');
      setConfirm('');
      setDone(company);
    } catch (error) {
      fail({ form: apiMessage(error, 'We could not create your organisation. Try again.') });
    } finally {
      setBusy(false);
    }
  };

  const titles = ['Activate license', 'Company details', 'Verify your email', 'Create your password'];
  const subtitles = [
    'Enter your enterprise license token to begin setup.',
    'Tell us about your company. You will be its first administrator.',
    signupEmail ? `We emailed a 6-digit code to ${signupEmail}.` : '',
    'Choose the password you will use to sign in to Mavera.',
  ];

  const formError = errors.form && <div className="mv-auth-alert" role="alert">{errors.form}</div>;
  const backButton = <button type="button" className="mv-secondary-button" onClick={goBack} disabled={busy}>Back</button>;

  return (
    <main className="mv-login-page mv-cs-page">
      <LoginBackdrop />
      <Link to="/login" className="mv-cs-top-link"><ChevronLeftIcon size={14} aria-hidden /> Back to sign in</Link>

      <div className="mv-cs-stage">
        <aside className="mv-cs-aside" aria-label="What your company gets with Mavera">
          <img className="mv-cs-logo" src={maveraLogo} alt="Mavera" width={240} />
          <p className="mv-eyebrow">Protect · Optimize · Govern</p>
          <h2 className="mv-cs-headline">One workspace for cloud spend and SAP health</h2>
          <p className="mv-cs-lede">Activate your license and your team can start watching costs, systems and alerts the same day.</p>
          <ul className="mv-cs-offer">
            {OFFER.map(({ icon: Icon, tag, title, body }) => (
              <li key={title}>
                <span className="mv-cs-offer-icon" aria-hidden="true"><Icon size={18} /></span>
                <div>
                  <strong>{title} <span className="mv-cs-offer-tag">{tag}</span></strong>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <section className="mv-cs-card" aria-labelledby="cs-title">
          <h1 id="cs-title" className="mv-cs-title">Set up your company</h1>
          <p className="mv-cs-sub">A few quick steps to activate your license and get started.</p>
          <SignupStepper current={current} complete={Boolean(done)} />

          {done ? (
            <div className="mv-cs-body">
              <div className="mv-cs-success" role="status">
                <span className="mv-cs-success-mark" aria-hidden="true"><CheckIcon size={22} /></span>
                <h2 ref={headingRef} tabIndex={-1} className="mv-cs-step-title">Your organisation is ready</h2>
                <p className="mv-cs-sub">
                  {done.organizationName} is set up. Sign in as <strong>{done.adminEmail}</strong> with the password you just chose.
                </p>
              </div>
              <LicenseSummary titleId="cs-summary-title" verified={false} license={{ organizationName: done.organizationName, plan: done.plan, seats: done.seats, modules: done.modules, cloudAccess: license?.cloudAccess ?? [], expiresAt: done.expiresAt }} />
              <button type="button" className="mv-signin-submit" onClick={() => navigate('/login')}>Continue to sign in</button>
            </div>
          ) : (
            <div className="mv-cs-body">
              <h2 ref={headingRef} tabIndex={-1} className="mv-cs-step-title">{titles[current]}</h2>
              <p className="mv-cs-sub" id="cs-step-sub">{subtitles[current]}</p>
              {formError}

              {current === 0 && (
                <form noValidate onSubmit={validateLicense} aria-busy={busy}>
                  <div className="mv-cs-field">
                    <PasswordField
                      id="cs-token" name="licenseToken" label="License token" subject="token" leadingIcon={<LockIcon size={16} />}
                      value={token} onChange={(event) => { setToken(event.target.value); clearError('token'); }}
                      placeholder="Enter your 64-character token" autoComplete="off" autoCapitalize="none" spellCheck={false} autoFocus
                      aria-invalid={errors.token ? true : undefined} aria-describedby={errors.token ? 'cs-token-error' : 'cs-token-help'}
                    />
                    {errors.token
                      ? <span id="cs-token-error" className="mv-field-error" role="alert">{errors.token}</span>
                      : <span id="cs-token-help" className="mv-field-help">{token.trim().length} of 64 characters. Your Maitsys administrator issues the token.</span>}
                  </div>
                  <button type="submit" className="mv-signin-submit" disabled={busy}>{busy ? 'Checking license…' : 'Validate license'}</button>
                  <Link to="/login" className="mv-signin-link-button mv-cs-center-link">Back to sign in</Link>

                  {samples.length > 0 && (
                    <section className="mv-cs-sample" aria-labelledby="cs-sample-title">
                      <h3 id="cs-sample-title">Prototype: sample license tokens</h3>
                      <p>There is no license server in this prototype. Copy or use one of these to try the flow.</p>
                      <ul>
                        {samples.map((sample) => (
                          <li key={sample.token}>
                            <span className="mv-cs-sample-label">{sample.label}</span>
                            <code title={sample.token}>{shortenToken(sample.token)}</code>
                            <span className="mv-cs-sample-actions">
                              <CopyButton value={sample.token} label="Copy" ariaLabel={`Copy ${sample.label} sample token`} />
                              <button type="button" className="mv-quiet-button" onClick={() => { setToken(sample.token); clearError('token'); }} aria-label={`Use ${sample.label} sample token`}>Use</button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </form>
              )}

              {current === 1 && license && (
                <form noValidate onSubmit={submitCompany} aria-busy={busy}>
                  <LicenseSummary titleId="cs-license-title" license={license} />
                  <TextField id="cs-company" label="Company name" value={details.companyName} onChange={(e) => setDetail('companyName')(e.target.value)} autoComplete="organization" error={errors.companyName} help="Pre-filled from your license. Change it if your organisation trades under another name." />
                  <TextField id="cs-name" label="Your full name" value={details.adminName} onChange={(e) => setDetail('adminName')(e.target.value)} autoComplete="name" error={errors.adminName} />
                  <TextField id="cs-email" type="email" label="Work email" value={details.email} onChange={(e) => setDetail('email')(e.target.value)} autoComplete="email" error={errors.email} help="We send your verification code here. You will sign in with it." />
                  <div className="mv-cs-grid">
                    <TextField id="cs-phone" type="tel" label="Phone" optional value={details.phone} onChange={(e) => setDetail('phone')(e.target.value)} autoComplete="tel" error={errors.phone} />
                    <div className="mv-cs-field">
                      <Select
                        label="Country" required value={details.country} onChange={setDetail('country')}
                        options={[{ value: '', label: 'Select a country' }, ...COUNTRIES.map((country) => ({ value: country as string, label: country }))]}
                      />
                      {errors.country && <span id="cs-country-error" className="mv-field-error" role="alert">{errors.country}</span>}
                    </div>
                  </div>
                  <div className="mv-cs-field">
                    <Select
                      label="Company size (optional)" value={details.companySize} onChange={setDetail('companySize')}
                      options={[{ value: '', label: 'Not specified' }, ...COMPANY_SIZES.map((size) => ({ value: size as string, label: size }))]}
                    />
                  </div>
                  <div className="mv-cs-actions">
                    {backButton}
                    <button type="submit" className="mv-signin-submit" disabled={busy}>{busy ? 'Saving…' : 'Continue'}</button>
                  </div>
                </form>
              )}

              {current === 2 && signupEmail && (
                <form noValidate onSubmit={submitCode} aria-busy={busy}>
                  {verifiedEmail === signupEmail ? (
                    <div className="mv-auth-alert mv-auth-alert--success" role="status">Email address verified.</div>
                  ) : (
                    <>
                      <TextField
                        id="cs-code" name="otp" label="Verification code" value={code} inputMode="numeric" maxLength={6} autoComplete="one-time-code"
                        placeholder="000000" className="mv-cs-code"
                        onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); clearError('code'); }} error={errors.code}
                      />
                      {prototypeCode && (
                        <p className="mv-cs-proto">
                          Prototype: no email is sent. Your code is <code>{prototypeCode}</code>.
                          <button type="button" className="mv-quiet-button" onClick={() => { setCode(prototypeCode); clearError('code'); }}>Fill it in</button>
                        </p>
                      )}
                      <div className="mv-cs-resend">
                        {secondsLeft > 0
                          ? <span className="mv-muted" role="timer">Resend code in {formatCountdown(secondsLeft)}</span>
                          : <button type="button" className="mv-quiet-button" onClick={resend} disabled={busy}><MailIcon size={14} aria-hidden /> Resend code</button>}
                      </div>
                      <p className="mv-cs-note" role="status">{resendNote}</p>
                    </>
                  )}
                  <div className="mv-cs-actions">
                    {backButton}
                    <button type="submit" className="mv-signin-submit" disabled={busy}>{busy ? 'Verifying…' : verifiedEmail === signupEmail ? 'Continue' : 'Verify email'}</button>
                  </div>
                </form>
              )}

              {current === 3 && (
                <form noValidate onSubmit={submitPassword} aria-busy={busy}>
                  <input className="mv-sr-only" type="text" name="username" autoComplete="username" value={signupEmail ?? ''} readOnly tabIndex={-1} aria-hidden="true" />
                  <div className="mv-cs-field">
                    <PasswordField
                      id="cs-password" name="password" label="Password" value={password} autoComplete="new-password"
                      onChange={(event) => { setPassword(event.target.value); clearError('password'); }}
                      aria-invalid={errors.password ? true : undefined} aria-describedby={errors.password ? 'cs-password-error cs-strength' : 'cs-strength'}
                    />
                    {errors.password && <span id="cs-password-error" className="mv-field-error" role="alert">{errors.password}</span>}
                  </div>
                  <PasswordStrengthMeter password={password} id="cs-strength" />
                  <div className="mv-cs-field">
                    <PasswordField
                      id="cs-confirm" name="confirmPassword" label="Confirm password" value={confirm} autoComplete="new-password"
                      onChange={(event) => { setConfirm(event.target.value); clearError('confirm'); }}
                      aria-invalid={errors.confirm ? true : undefined} aria-describedby={errors.confirm ? 'cs-confirm-error' : undefined}
                    />
                    {errors.confirm && <span id="cs-confirm-error" className="mv-field-error" role="alert">{errors.confirm}</span>}
                  </div>
                  <div className="mv-cs-actions">
                    {backButton}
                    <button type="submit" className="mv-signin-submit" disabled={busy}>{busy ? 'Creating organisation…' : 'Create organisation'}</button>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>
      </div>

      <footer className="mv-login-footer">
        <span className="mv-login-footer-brand">Powered by <img src={maitsysLogo} alt="Maitsys" className="mv-maitsys-logo" /></span>
        <a href="https://www.maitsys.com/contact-us" target="_blank" rel="noreferrer">Support</a>
        <a href="https://www.maitsys.com" target="_blank" rel="noreferrer">maitsys.com</a>
      </footer>
    </main>
  );
}
