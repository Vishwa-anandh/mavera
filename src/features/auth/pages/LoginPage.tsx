import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, DEMO_PASSWORD } from '../model/AuthContext';
import { useSuperAdminAuth, DEMO_USERNAME as SA_DEMO_USERNAME, DEMO_PASSWORD as SA_DEMO_PASSWORD } from '../../superAdmin';
import { LoginBackdrop } from '../components/LoginBackdrop';
import { DemoModePanel } from '../components/DemoModePanel';
import { PasswordField } from '../../../shared/ui/PasswordField';
import { BuildingIcon, LockIcon, MailIcon, ShieldIcon } from '../../../shared/ui/icons';
import maveraLogo from '../../../../assets/brand/mavera-logo.png';
import maitsysLogo from '../../../../assets/brand/maitsys.png';

const DEMO_PANEL_KEY = 'mavera.login.demoPanel';

interface LoginErrorResponse { response?: { data?: { error?: string; isLocked?: boolean } }; }

export function LoginPage() {
  const { login, unlockAccount, isAuthenticated } = useAuth();
  const { login: superAdminLogin } = useSuperAdminAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [accountLocked, setAccountLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null);
  const [unlockEmail, setUnlockEmail] = useState('');
  // Two-step sign-in: the email is confirmed first, then the password is
  // asked for against it. There's no backend "does this account exist"
  // endpoint, so step 1 validates the address format only; the account
  // itself is verified when the password is submitted. Typing the Super
  // Admin username here instead of an email routes the same two-step form
  // into the separate Super Admin session/portal — one login form for both.
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordPrefill] = useState('');
  const [isSuperAdminFlow, setIsSuperAdminFlow] = useState(false);

  useEffect(() => { if (isAuthenticated) navigate('/', { replace: true }); }, [isAuthenticated, navigate]);

  const handleLogin = async (identity: string, password: string, superAdmin = isSuperAdminFlow) => {
    setError(null); setSubmitting(true);
    try {
      if (superAdmin) {
        await superAdminLogin(identity, password);
        navigate('/admin/dashboard');
      } else {
        await login(identity, password);
        navigate('/');
      }
    } catch (err) {
      const data = (err as LoginErrorResponse).response?.data;
      if (data?.isLocked) { setUnlockEmail(identity); setAccountLocked(true); }
      else setError(data?.error ?? 'Incorrect email or password.');
    } finally { setSubmitting(false); }
  };

  const handleUnlock = async (unlockToken: string) => {
    setError(null);
    try { await unlockAccount(unlockEmail, unlockToken); setAccountLocked(false); setUnlockMessage('Your account has been unlocked. You can now log in.'); }
    catch (err) { setError((err as LoginErrorResponse).response?.data?.error ?? 'That unlock code is invalid or has expired.'); }
  };

  const handleContinue = (value: string) => {
    const trimmed = value.trim();
    if (trimmed === SA_DEMO_USERNAME) {
      setEmailError(null);
      setError(null);
      setEmail(trimmed);
      setIsSuperAdminFlow(true);
      setStep('password');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setEmailError('Enter a valid work email address.');
      return;
    }
    setEmailError(null);
    setError(null);
    setEmail(trimmed);
    setIsSuperAdminFlow(false);
    setStep('password');
  };

  const changeEmail = () => {
    setError(null);
    setIsSuperAdminFlow(false);
    setStep('email');
  };

  const [demoOpen, setDemoOpen] = useState(() => {
    try { return sessionStorage.getItem(DEMO_PANEL_KEY) !== 'closed'; } catch { return true; }
  });
  const setDemoVisible = (open: boolean) => {
    setDemoOpen(open);
    try { sessionStorage.setItem(DEMO_PANEL_KEY, open ? 'open' : 'closed'); } catch { /* storage unavailable: the choice lasts for this visit */ }
  };
  const signInAsDemo = (identity: string, superAdmin: boolean) => {
    void handleLogin(identity, superAdmin ? SA_DEMO_PASSWORD : DEMO_PASSWORD, superAdmin);
  };

  const sessionError = searchParams.get('error');
  const onPasswordStep = step === 'password' && !accountLocked;

  return (
    <main className="mv-login-page">
      <LoginBackdrop />

      <Link to="/company-signup" className="mv-register-pill">
        <span className="mv-register-pill-icon" aria-hidden="true"><BuildingIcon size={16} /></span>
        <span className="mv-register-pill-text"><strong>Register company</strong><small>For business</small></span>
      </Link>

      <div className="mv-login-stage">
        <section className="mv-signin-card" aria-labelledby="signin-title">
          {accountLocked ? (
            <div className="mv-signin-tile"><ShieldIcon size={22} /></div>
          ) : (
            <img className="mv-signin-logo" src={maveraLogo} alt="Mavera" width={300} />
          )}
          <h1 id="signin-title" className="mv-signin-title">{accountLocked ? 'Unlock your account' : onPasswordStep ? 'Enter your password' : 'Sign in to Mavera'}</h1>
          <p className="mv-signin-copy">
            {accountLocked
              ? 'Your account is locked. Enter the unlock code we sent you.'
              : onPasswordStep
                ? 'Signing in as'
                : 'Enter your work email to continue.'}
          </p>
          {onPasswordStep && (
            <div className="mv-signin-identity">
              {isSuperAdminFlow ? <ShieldIcon size={14} /> : <MailIcon size={14} />}
              <span>{email}</span>
              <button type="button" onClick={changeEmail}>Change</button>
            </div>
          )}

          {sessionError === 'session_expired' && <div className="mv-auth-alert" role="alert">Your session expired. Please sign in again.</div>}
          {sessionError === 'account_deactivated' && <div className="mv-auth-alert" role="alert">This account has been deactivated. Contact your administrator.</div>}
          {unlockMessage && <div className="mv-auth-alert mv-auth-alert--success" role="status">{unlockMessage}</div>}
          {error && <div className="mv-auth-alert" role="alert">{error}</div>}

          {accountLocked ? (
            <form key="unlock" onSubmit={(event) => { event.preventDefault(); void handleUnlock(String(new FormData(event.currentTarget).get('unlockToken') ?? '')); }}>
              <label className="mv-field">
                <span className="mv-sr-only">Unlock code</span>
                <span className="mv-input-with-icon">
                  <span className="mv-input-icon" aria-hidden><LockIcon size={16} /></span>
                  <input name="unlockToken" required autoComplete="one-time-code" placeholder="Unlock code" />
                </span>
              </label>
              <button className="mv-signin-submit" type="submit">Unlock account</button>
              <button className="mv-signin-link-button" type="button" onClick={() => setAccountLocked(false)}>Back to sign in</button>
            </form>
          ) : (
            step === 'email' ? (
              <form key="email" noValidate onSubmit={(event) => { event.preventDefault(); handleContinue(String(new FormData(event.currentTarget).get('email') ?? '')); }}>
                <label className="mv-field">
                  <span className="mv-sr-only">Email</span>
                  <span className="mv-input-with-icon">
                    <span className="mv-input-icon" aria-hidden><MailIcon size={16} /></span>
                    <input
                      name="email" type="email" required autoComplete="username" placeholder="Work email" autoFocus
                      defaultValue={email} aria-invalid={emailError ? true : undefined} aria-describedby={emailError ? 'signin-email-error' : undefined}
                      onChange={() => { if (emailError) setEmailError(null); }}
                    />
                  </span>
                  {emailError && <span id="signin-email-error" className="mv-field-error" role="alert">{emailError}</span>}
                </label>
                <button className="mv-signin-submit" type="submit">Continue</button>
              </form>
            ) : (
              <form key="password" onSubmit={(event) => { event.preventDefault(); void handleLogin(email, String(new FormData(event.currentTarget).get('password') ?? '')); }}>
                {/* Lets password managers pair the saved password with this account.
                    type="text" (not "email") since the Super Admin flow's identity is
                    a plain username, not an email address, and this form has no
                    noValidate to otherwise suppress the mismatch. */}
                <input className="mv-sr-only" type="text" name="username" autoComplete="username" value={email} readOnly tabIndex={-1} aria-hidden="true" />
                <PasswordField
                  label="Password" hideLabel leadingIcon={<LockIcon size={16} />} name="password" required
                  autoComplete="current-password" placeholder="Password" autoFocus
                  defaultValue={passwordPrefill}
                />
                <div className="mv-signin-options">
                  <label><input type="checkbox" name="remember" /> Keep me signed in</label>
                  <Link to="/forgot-password">Forgot password?</Link>
                </div>
                <button className="mv-signin-submit" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
              </form>
            )
          )}

        </section>

        {!accountLocked && step === 'email' && (
          demoOpen ? (
            <DemoModePanel onPick={signInAsDemo} onClose={() => setDemoVisible(false)} superAdminUsername={SA_DEMO_USERNAME} disabled={submitting} />
          ) : (
            <button type="button" className="mv-demo-reopen" onClick={() => setDemoVisible(true)}>Demo accounts</button>
          )
        )}
      </div>

      <footer className="mv-login-footer">
        <span className="mv-login-footer-brand">Powered by <img src={maitsysLogo} alt="Maitsys" className="mv-maitsys-logo" /></span>
        <Link to="/invoice-demo">Try the invoice parser</Link>
        <a href="https://www.maitsys.com/contact-us" target="_blank" rel="noreferrer">Support</a>
        <a href="https://www.maitsys.com" target="_blank" rel="noreferrer">maitsys.com</a>
      </footer>
    </main>
  );
}
