import { budgetsRepository, sapAdminRepository, workspaceRepository, type OrganisationProfile } from '../../../../data-access';
import { CheckIcon } from '../../../../shared/ui/icons';
import { useAccessDirectory } from '../../../access';
import { useContinueHandler, type RegisterContinue } from '../../model/useContinueHandler';
import type { SetupModel, SetupStepId } from '../../model/setupSteps';
import { FormCard } from '../FormCard';

interface ReviewStepProps {
  register: RegisterContinue;
  model: SetupModel;
  profile: OrganisationProfile;
  visited: SetupStepId[];
  onOpenStep: (id: SetupStepId) => void;
  /** Called by Continue: leaves the wizard for the dashboard. */
  onFinish: () => void;
}

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/** What each step produced, in a sentence; the steps themselves decide whether it is done. */
function detailOf(id: SetupStepId, profile: OrganisationProfile, memberCount: number): string {
  switch (id) {
    case 'profile': return profile.savedAt ? `${profile.name} saved` : 'Not saved yet';
    case 'invite': return memberCount > 1 ? `${plural(memberCount, 'person', 'people')} in your team` : 'Only you so far';
    case 'notifications': return `${plural(budgetsRepository.listChannels().filter((c) => c.enabled).length, 'alert channel')}`;
    case 'cloud': return plural(workspaceRepository.accountCount(), 'cloud account');
    case 'budget': return plural(budgetsRepository.listBudgets().length, 'budget');
    case 'sap': return plural(sapAdminRepository.destinations.count(), 'SAP system');
    case 'review': return '';
  }
}

/** Last step: a summary of everything set up, anything left to open, and the way into the dashboard. */
export function ReviewStep({ register, model, profile, visited, onOpenStep, onFinish }: ReviewStepProps) {
  const { members } = useAccessDirectory();
  useContinueHandler(register, () => { onFinish(); return false; });
  const rows = model.steps.filter((step) => step.id !== 'review');
  const allDone = model.done === model.total;
  return (
    <div className="mv-setup-stack">
      <FormCard
        title={allDone ? 'You are all set' : `${model.total - model.done} ${model.total - model.done === 1 ? 'step' : 'steps'} left`}
        description={allDone ? 'Everything is set up. Open the dashboard to see your data.' : 'You can finish these later from the dashboard checklist or the profile menu. Nothing here is lost.'}
      >
        <ul className="mv-setup-list" aria-label="Setup summary">
          {rows.map((step) => (
            <li key={step.id} className="mv-setup-list-row">
              <span className={`mv-setup-mark${step.complete ? ' is-complete' : ''}`} aria-hidden>{step.complete ? <CheckIcon size={14} /> : step.number}</span>
              <span className="mv-setup-list-text">
                <strong>{step.title}</strong>
                <span className="mv-muted">{detailOf(step.id, profile, members.length)}</span>
              </span>
              {step.complete
                ? <span className="mv-status mv-status--success">Done</span>
                : <button type="button" className="mv-quiet-button" onClick={() => onOpenStep(step.id)} aria-label={`${visited.includes(step.id) ? 'Finish' : 'Start'} ${step.title}`}>{visited.includes(step.id) ? 'Skipped. Finish it' : 'Start'}</button>}
            </li>
          ))}
        </ul>
      </FormCard>
    </div>
  );
}
