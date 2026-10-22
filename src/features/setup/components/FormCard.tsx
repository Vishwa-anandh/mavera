import { useId, type ReactNode } from 'react';

interface FormCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  /** Controls placed at the right of the card header (a status tag, a shortcut). */
  aside?: ReactNode;
}

/** A card of the setup form: a title and one line on what it is for, a divider, then the fields. */
export function FormCard({ title, description, aside, children }: FormCardProps) {
  const titleId = useId();
  return (
    <section className="mv-setup-card" aria-labelledby={titleId}>
      <header className="mv-setup-card-head">
        <div>
          <h2 id={titleId} className="mv-setup-card-title">{title}</h2>
          {description && <p className="mv-muted">{description}</p>}
        </div>
        {aside}
      </header>
      <div className="mv-setup-card-body">{children}</div>
    </section>
  );
}

interface SetupFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Character limit: shows a live "12/80" counter. */
  max?: number;
  error?: string;
  help?: string;
  optional?: boolean;
  multiline?: boolean;
  rows?: number;
  type?: 'text' | 'tel' | 'url' | 'email';
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  required?: boolean;
}

/** A labelled text field with its error or help line and, when it has a limit, a live character counter. */
export function SetupField({ label, value, onChange, max, error, help, optional, multiline, rows = 3, type = 'text', placeholder, autoComplete = 'off', autoFocus, required }: SetupFieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const over = max !== undefined && value.length > max;
  const common = {
    id,
    value,
    placeholder,
    autoComplete,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': noteId,
    'aria-required': required || undefined,
    'data-autofocus': autoFocus ? '' : undefined,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
  };
  return (
    <div className="mv-field mv-setup-field">
      <label htmlFor={id}>{label}{optional && <span className="mv-muted"> (optional)</span>}</label>
      {multiline ? <textarea rows={rows} {...common} /> : <input type={type} {...common} />}
      <div className="mv-setup-field-foot" id={noteId}>
        {error ? <span className="mv-field-error" role="alert">{error}</span> : <span className="mv-field-help">{help ?? ''}</span>}
        {max !== undefined && <span className={`mv-setup-counter${over ? ' is-over' : ''}`} aria-label={`${value.length} of ${max} characters`}>{value.length}/{max}</span>}
      </div>
    </div>
  );
}
