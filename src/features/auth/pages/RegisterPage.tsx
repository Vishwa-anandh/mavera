import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, type RegisterPayload } from '../model/AuthContext';
import { PasswordField } from '../../../shared/ui/PasswordField';
import type { CloudProvider } from '../../../shared/types/auth';
const CLOUDS: { label: string; value: CloudProvider }[] = [{ label: 'Azure', value: 'azure' }, { label: 'AWS', value: 'aws' }, { label: 'SAP BTP', value: 'btp' }, { label: 'Google Cloud', value: 'gcp' }];
type Values = { email: string; otp: string; fullName: string; inviteToken: string; orgName: string; password: string; confirmPassword: string; cloudPreference: CloudProvider[]; invoiceOnly: boolean; };
const empty: Values = { email: '', otp: '', fullName: '', inviteToken: '', orgName: '', password: '', confirmPassword: '', cloudPreference: [], invoiceOnly: false };
function strength(password: string) { return [password.length >= 8, /[a-z]/.test(password), /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length; }
export function RegisterPage() {
  const { register, sendOtp, verifyOtp } = useAuth(); const navigate = useNavigate(); const [step, setStep] = useState(0); const [values, setValues] = useState<Values>(empty); const [org, setOrg] = useState({ exists: false, name: '' }); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const set = (event: React.ChangeEvent<HTMLInputElement>) => setValues((current) => ({ ...current, [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  const send = async () => { if (!/^\S+@\S+\.\S+$/.test(values.email)) return setError('Enter a valid email address.'); setBusy(true); setError(null); try { const result = await sendOtp(values.email); setOrg({ exists: result.orgExists, name: result.orgName ?? '' }); setValues((current) => ({ ...current, orgName: result.orgName ?? current.orgName })); setStep(1); } catch (err) { setError((err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Failed to send the verification code.'); } finally { setBusy(false); } };
  const verify = async () => { if (!values.otp) return setError('Enter the verification code we emailed you.'); setBusy(true); setError(null); try { await verifyOtp(values.email, values.otp); setStep(2); } catch (err) { setError((err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Invalid or expired verification code.'); } finally { setBusy(false); } };
  const details = () => {
    if (!values.fullName) return setError('Full name is required.');
    if (values.password.length < 8) return setError('Password must be at least 8 characters.');
    if (values.password !== values.confirmPassword) return setError('Passwords do not match.');
    if (!org.exists && !values.inviteToken.trim()) return setError('Invitation token is required to register a new organization.');
    if (!org.exists && !values.orgName.trim()) return setError('Company name is required to register a new organization.');
    setError(null);
    if (org.exists) void submit(); else setStep(3);
  };
  const canSubmitCloudStep = org.exists || values.invoiceOnly || values.cloudPreference.length > 0;
  const submit = async () => {
    if (!canSubmitCloudStep) return setError('Select at least one cloud provider or invoice upload.');
    setBusy(true); setError(null);
    const payload: RegisterPayload = { email: values.email, password: values.password, fullName: values.fullName, orgName: org.exists ? org.name : values.orgName, role: org.exists ? 'member' : 'admin', otp: values.otp, inviteToken: org.exists ? '' : values.inviteToken.trim(), cloudPreference: org.exists ? '' : values.cloudPreference.join(','), invoiceOnly: org.exists ? false : values.invoiceOnly };
    try {
      await register(payload);
      setStep(4);
    } catch (err) {
      const backendError = (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Registration failed. Please try again.';
      if (/invitation token/i.test(backendError)) {
        // The invite token is the one field on the details step a person
        // can't self-correct from the cloud-access step — send them back
        // to where it's editable, with plain-language next steps.
        setStep(2);
        setError('This invitation token is invalid or has already been used. Please request a new one from your Maitsys administrator.');
      } else {
        setError(backendError);
      }
    } finally {
      setBusy(false);
    }
  };
  const toggleCloud = (cloud: CloudProvider) => setValues((current) => ({ ...current, cloudPreference: current.cloudPreference.includes(cloud) ? current.cloudPreference.filter((item) => item !== cloud) : [...current.cloudPreference, cloud] }));
  const labels = ['Work email', 'Verify', 'Your details', 'Cloud access'];
  return <main className="mv-auth-page mv-auth-page--single"><section className="mv-auth-form-side"><div className="mv-auth-panel mv-auth-panel--wide"><p className="mv-eyebrow">Mavera workspace</p><h1 className="mv-auth-title">Create your account</h1><p className="mv-auth-copy">Set up monitoring for your organisation in a few secure steps.</p>{step < 4 && <ol className="mv-steps">{labels.slice(0, org.exists ? 3 : 4).map((label, index) => <li key={label} className={step >= index ? 'is-active' : ''}>{label}</li>)}</ol>}{error && <div className="mv-auth-alert" role="alert">{error}</div>}{step === 0 && <><label className="mv-field">Work email<input name="email" type="email" value={values.email} onChange={set} autoComplete="email" /></label><button className="mv-primary-button mv-auth-submit" disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Get verification code'}</button></>}{step === 1 && <><p className="mv-auth-copy">We sent a 6-digit code to <b>{values.email}</b>.</p><label className="mv-field">Verification code<input name="otp" value={values.otp} onChange={set} maxLength={6} inputMode="numeric" autoComplete="one-time-code" /></label><button className="mv-primary-button mv-auth-submit" disabled={busy} onClick={verify}>{busy ? 'Verifying…' : 'Verify code'}</button><button className="mv-quiet-button" onClick={() => setStep(0)}>Change email</button></>}{step === 2 && <><>{org.exists && <div className="mv-notice">You are joining {org.name}. Your account role will be Member.</div>}</><label className="mv-field">Full name<input name="fullName" value={values.fullName} onChange={set} autoComplete="name" /></label>{!org.exists && <><label className="mv-field">Invitation token<input name="inviteToken" value={values.inviteToken} onChange={set} /></label><label className="mv-field">Company name<input name="orgName" value={values.orgName} onChange={set} autoComplete="organization" /></label></>}<PasswordField label="Password" name="password" value={values.password} onChange={set} autoComplete="new-password" /><p className="mv-muted">Password strength: {strength(values.password)} / 5</p><PasswordField label="Confirm password" name="confirmPassword" value={values.confirmPassword} onChange={set} autoComplete="new-password" /><button className="mv-primary-button mv-auth-submit" disabled={busy} onClick={details}>{org.exists ? 'Finish registration' : 'Continue'}</button></>}{step === 3 && <><p className="mv-auth-copy">Choose how your organisation will track costs.</p><div className="mv-choice-grid">{CLOUDS.map((cloud) => <label className="mv-choice" key={cloud.value}><input type="checkbox" checked={values.cloudPreference.includes(cloud.value)} onChange={() => toggleCloud(cloud.value)} />{cloud.label}</label>)}</div><label className="mv-choice" style={{ marginTop: '0.75rem' }}><input name="invoiceOnly" type="checkbox" checked={values.invoiceOnly} onChange={set} />Invoice upload (PDF / CSV)</label><div className="mv-dialog-actions"><button className="mv-secondary-button" onClick={() => setStep(2)}>Back</button><button className="mv-primary-button" disabled={busy || !canSubmitCloudStep} onClick={submit}>{busy ? 'Creating…' : canSubmitCloudStep ? 'Create account' : 'Select at least one option'}</button></div></>}{step === 4 && <div className="mv-success"><p className="mv-eyebrow">Account ready</p><h2>Signup successful</h2><p>Your account has been created. We’ve sent a welcome email to your inbox.</p><button className="mv-primary-button" onClick={() => navigate('/login')}>Proceed to sign in</button></div>}{step < 4 && <div className="mv-auth-links"><Link to="/login">Already have an account? Sign in</Link><Link to="/company-signup">Register company</Link></div>}</div></section></main>;
}
