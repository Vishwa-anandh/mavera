import { CheckIcon, BuildingIcon } from '../../../shared/ui/icons';
import { initialsOf } from '../model/profileForm';
import type { SetupModel, SetupStep, SetupStepId } from '../model/setupSteps';

interface SetupRailProps {
  model: SetupModel;
  active: SetupStepId;
  onSelect: (id: SetupStepId) => void;
  company: { name: string; website: string; address: string; logoDataUrl: string | null };
}

/** The status circle: a check when complete, the number otherwise; the open step has an outline. */
export function StepMark({ step, active }: { step: SetupStep; active: boolean }) {
  return (
    <span className={`mv-setup-mark${step.complete ? ' is-complete' : ''}${active ? ' is-active' : ''}`} aria-hidden>
      {step.complete ? <CheckIcon size={14} /> : step.number}
    </span>
  );
}

/** The steps grouped under their section, each with a status circle joined by a line, its title and one line on it. */
export function SetupRail({ model, active, onSelect, company }: SetupRailProps) {
  return (
    <div className="mv-setup-rail-inner">
      <nav aria-label="Setup steps" className="mv-setup-nav">
        {model.groups.map((group) => (
          <section key={group.id} className="mv-setup-group" aria-label={group.label}>
            <h2 className="mv-setup-group-title">{group.label}</h2>
            <ol className="mv-setup-steps">
              {group.steps.map((step) => {
                const current = step.id === active;
                return (
                  <li key={step.id} className={`mv-setup-step${current ? ' is-active' : ''}${step.complete ? ' is-complete' : ''}`}>
                    <button type="button" className="mv-setup-step-button" aria-current={current ? 'step' : undefined} onClick={() => onSelect(step.id)} data-step={step.id}>
                      <StepMark step={step} active={current} />
                      <span className="mv-setup-step-text">
                        <span className="mv-setup-step-title">{step.title}{step.complete && <span className="mv-sr-only"> (complete)</span>}</span>
                        <span className="mv-setup-step-summary">{step.summary}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </nav>
      <aside className="mv-setup-company" aria-label="Your company">
        <div className="mv-setup-company-logo" aria-hidden>
          {company.logoDataUrl ? <img src={company.logoDataUrl} alt="" /> : <span>{initialsOf(company.name)}</span>}
        </div>
        <div className="mv-setup-company-text">
          <strong>{company.name}</strong>
          {company.website ? <span className="mv-muted">{company.website.replace(/^https?:\/\//, '')}</span> : <span className="mv-muted">No website yet</span>}
          {company.address ? <span className="mv-muted">{company.address}</span> : <span className="mv-muted"><BuildingIcon size={12} style={{ verticalAlign: -1, marginRight: '0.25rem' }} />No address yet</span>}
        </div>
      </aside>
    </div>
  );
}
