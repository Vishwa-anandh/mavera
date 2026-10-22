import { useId } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { workspaceRepository, type OnboardingStepId } from '../../../data-access';
import { CHECKLIST_COACH_FLOWS, requestCoachFlow, requestPageTour } from '../../../shared/lib/assistantEvents';
import { useRememberedState } from '../../../shared/lib/useRememberedState';
import { CheckIcon, ChevronDownIcon, CloseIcon, SparkleIcon } from '../../../shared/ui/icons';
import { openConnectTarget } from '../model/connectTargets';
import type { OnboardingModules } from '../model/onboardingProgress';
import { useOnboardingProgress } from '../model/useOnboardingProgress';
import { useAccess } from '../../access';

interface StepCopy {
  /** What the one primary button says. */
  action: string;
  /** One line on why the step is worth doing. */
  why: string;
}

const COPY: Record<OnboardingStepId, StepCopy> = {
  cloud: { action: 'Connect', why: 'See spend, forecasts and savings from Azure, AWS, Google Cloud or SAP BTP in one place.' },
  sap: { action: 'Connect', why: 'Monitor system health, jobs, dumps and alerts for your SAP landscape.' },
  budget: { action: 'Create budget', why: 'Get warned before spend crosses your limit.' },
  alerts: { action: 'Add recipients', why: 'Make sure someone is told when something needs attention.' },
  teammate: { action: 'Invite', why: 'Bring in the people who act on the alerts.' },
  tour: { action: 'Start tour', why: 'Two minutes to see where everything is.' },
};

interface OnboardingCardProps {
  /** The modules the organisation subscribes to; a step of a module it lacks is not listed. */
  modules: OnboardingModules;
}

/**
 * The getting-started checklist on the dashboard: what is left to set up, each step with one button that goes
 * straight to the action (a connect form, a pre-opened form on another page, the tour) and "Guide me", which
 * starts the live coach for that step. It shows only while something real is left, can be collapsed to its
 * header, and can be hidden; hiding is remembered (workspaceRepository) and the assistant or the profile menu
 * brings it back. Progress is derived from the stores, so it can never disagree with the pages.
 */
export function OnboardingCard({ modules }: OnboardingCardProps) {
  const progress = useOnboardingProgress(modules);
  const navigate = useNavigate();
  const { ownRoleId } = useAccess();
  const canOpenSetup = ownRoleId === 'owner' || ownRoleId === 'admin';
  const [collapsed, setCollapsed] = useRememberedState('onboarding', 'collapsed', false);
  const titleId = useId();
  const listId = useId();

  if (!progress.relevant || progress.dismissed) return null;

  const percent = Math.round((progress.doneCount / progress.total) * 100);
  const run = (id: OnboardingStepId) => {
    if (id === 'cloud') openConnectTarget('cloud');
    else if (id === 'sap') openConnectTarget('sap');
    else if (id === 'budget') navigate('/budgets?open=new');
    else if (id === 'alerts') navigate('/budgets?open=add-channel#integrations');
    else if (id === 'teammate') navigate('/users?open=add-user');
    else requestPageTour();
  };

  return (
    <section className="mv-panel mv-onboarding" aria-labelledby={titleId} data-collapsed={collapsed || undefined}>
      <div className="mv-onboarding-head">
        <div className="mv-onboarding-heading">
          <h2 id={titleId} className="mv-panel-title">Get started with Mavera</h2>
          <p className="mv-muted" aria-live="polite">{progress.doneCount} of {progress.total} done{canOpenSetup && <> · <Link to="/setup">Open full setup</Link></>}</p>
        </div>
        <div className="mv-onboarding-tools">
          <button
            type="button"
            className="mv-icon-button"
            aria-expanded={!collapsed}
            aria-controls={listId}
            aria-label={collapsed ? 'Expand the checklist' : 'Collapse the checklist'}
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronDownIcon size={16} className={collapsed ? 'mv-onboarding-chevron is-collapsed' : 'mv-onboarding-chevron'} />
          </button>
          <button
            type="button"
            className="mv-icon-button"
            aria-label="Hide the checklist"
            title="Hide. Bring it back from the assistant or your profile menu."
            onClick={() => workspaceRepository.dismissOnboarding()}
          >
            <CloseIcon size={16} />
          </button>
        </div>
      </div>
      <div className="mv-onboarding-bar" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.doneCount} aria-label={`${progress.doneCount} of ${progress.total} steps done`}>
        <span style={{ width: `${percent}%` }} />
      </div>

      {!collapsed && (
        <ol id={listId} className="mv-onboarding-steps">
          {progress.steps.map((step) => {
            const copy = COPY[step.id];
            const guided = Boolean(CHECKLIST_COACH_FLOWS[step.id]);
            return (
              <li key={step.id} className={`mv-onboarding-step${step.done ? ' is-done' : ''}`}>
                <span className="mv-onboarding-mark" aria-hidden>{step.done ? <CheckIcon size={14} /> : null}</span>
                <div className="mv-onboarding-text">
                  <strong id={`${listId}-${step.id}`}>{step.label}{step.done && <span className="mv-sr-only"> (done)</span>}</strong>
                  <span className="mv-muted">{copy.why}</span>
                </div>
                {!step.done && (
                  <div className="mv-onboarding-actions">
                    <button type="button" className="mv-primary-button" aria-describedby={`${listId}-${step.id}`} onClick={() => run(step.id)}>{copy.action}</button>
                    {guided && (
                      <button type="button" className="mv-quiet-button" aria-describedby={`${listId}-${step.id}`} onClick={() => requestCoachFlow(CHECKLIST_COACH_FLOWS[step.id])}>
                        <SparkleIcon size={14} /> Guide me
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
