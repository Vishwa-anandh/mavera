import { PASSWORD_CHECKS, passwordStrength, passwordStrengthLabel } from '../lib/passwordStrength';

/**
 * A five-segment strength meter with a text label and the list of checks, so the result never relies
 * on colour alone. The label is announced politely as it changes.
 */
export function PasswordStrengthMeter({ password, id }: { password: string; id?: string }) {
  const score = passwordStrength(password);
  const level = password ? passwordStrengthLabel(score) : 'Not set';
  return (
    <div className="mv-strength" id={id}>
      <div className="mv-strength-head">
        <span>Password strength</span>
        <strong aria-live="polite">{level}</strong>
      </div>
      <div className="mv-strength-bar" role="presentation">
        {PASSWORD_CHECKS.map((check, index) => (
          <i key={check.id} className={index < score && password ? `is-on is-level-${score}` : undefined} />
        ))}
      </div>
      <ul className="mv-strength-checks">
        {PASSWORD_CHECKS.map((check) => {
          const met = check.test(password);
          return (
            <li key={check.id} className={met ? 'is-met' : undefined}>
              <span aria-hidden="true">{met ? '✓' : '○'}</span>
              {check.label}
              <span className="mv-sr-only">{met ? ' (met)' : ' (not met)'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
