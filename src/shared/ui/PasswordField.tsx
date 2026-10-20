import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { EyeIcon, EyeSlashIcon } from './icons';

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  /** Icon drawn inside the field on the left (the sign-in card style). */
  leadingIcon?: ReactNode;
  /** Keep the label for assistive tech but don't show it — for fields whose
   * placeholder and icon already make the purpose obvious. */
  hideLabel?: boolean;
  /** What the show/hide button reveals, for its accessible name ("Show password"); defaults to "password". */
  subject?: string;
}

/**
 * A password input with a show/hide toggle. Keeps the
 * `<label className="mv-field">Label<input/></label>` implicit-labeling shape
 * the auth pages' tests rely on (`getByLabelText('Password')` etc.).
 */
export function PasswordField({ label, leadingIcon, hideLabel, subject = 'password', ...inputProps }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="mv-field">
      {hideLabel ? <span className="mv-sr-only">{label}</span> : label}
      <span className={`mv-password-control${leadingIcon ? ' mv-input-with-icon' : ''}`}>
        {leadingIcon && <span className="mv-input-icon" aria-hidden>{leadingIcon}</span>}
        <input {...inputProps} type={visible ? 'text' : 'password'} />
        <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? `Hide ${subject}` : `Show ${subject}`}>
          {visible ? <EyeIcon size={18} /> : <EyeSlashIcon size={18} />}
        </button>
      </span>
    </label>
  );
}
