import { CheckIcon } from '../../../shared/ui/icons';
import { SIGNUP_STEPS } from '../model/companySignup';

/**
 * The four-step progress indicator of the Register company flow: an ordered list in which the
 * current step carries aria-current="step" and finished steps say so to assistive technology.
 * `current` is the zero-based step; `complete` marks every step as finished (the success screen).
 */
export function SignupStepper({ current, complete = false }: { current: number; complete?: boolean }) {
  return (
    <ol className="mv-cs-steps" aria-label="Setup progress">
      {SIGNUP_STEPS.map((step, index) => {
        const finished = complete || index < current;
        const active = !complete && index === current;
        return (
          <li key={step.id} className={finished ? 'is-done' : active ? 'is-current' : undefined} aria-current={active ? 'step' : undefined}>
            <span className="mv-cs-step-dot" aria-hidden="true">{finished ? <CheckIcon size={14} /> : index + 1}</span>
            <span className="mv-cs-step-label">
              {step.label}
              {finished && <span className="mv-sr-only"> (completed)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
