import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth';
import { ConnectDialogHost } from '../../workspace';
import { useHashTab } from '../../../shared/lib/useHashTab';
import { useConfirm } from '../../../shared/ui/ConfirmProvider';
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, InfoIcon, MenuIcon } from '../../../shared/ui/icons';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { TooltipProvider } from '../../../shared/ui/TooltipProvider';
import { useModalOverlay } from '../../../shared/ui/useOverlay';
import { SetupRail, StepMark } from '../components/SetupRail';
import { BudgetStep } from '../components/steps/BudgetStep';
import { CloudStep } from '../components/steps/CloudStep';
import { InviteStep } from '../components/steps/InviteStep';
import { NotificationsStep } from '../components/steps/NotificationsStep';
import { ProfileStep } from '../components/steps/ProfileStep';
import { ReviewStep } from '../components/steps/ReviewStep';
import { SapStep } from '../components/steps/SapStep';
import { companyOf } from '../model/profileForm';
import { readSetupMemory, writeSetupMemory, type SetupMemory } from '../model/setupMemory';
import { minutesLabel, type SetupStepId } from '../model/setupSteps';
import type { ContinueHandler } from '../model/useContinueHandler';
import { useCompactLayout } from '../model/useCompactLayout';
import { useProfileDraft } from '../model/useProfileDraft';
import { useCanRunSetup, useSetup } from '../model/useSetup';
import maveraLogo from '../../../../assets/brand/mavera-logo.png';
import maveraEmblem from '../../../../assets/brand/mavera-emblem.png';

/** One paragraph under each step's title: what it is for and what Continue does. */
const STEP_INTRO: Record<SetupStepId, string> = {
  profile: 'Tell us who your organisation is. Continue saves the profile.',
  invite: 'Add the people who will use Mavera. You can add several; Continue adds anyone you have typed.',
  notifications: 'Choose who is told when a budget is crossed or an alert needs attention.',
  cloud: 'Connect an Azure, AWS, Google Cloud or SAP BTP account to see real-looking spend straight away.',
  budget: 'Set a monthly limit and be warned before you reach it. The limit is suggested from your spend.',
  sap: 'Connect an SAP system to monitor its health, jobs and alerts.',
  review: 'A last look at what is done. Anything left stays on your dashboard checklist.',
};

/**
 * The guided first-time setup: a full page outside the app menus, with its own header (progress, user, sign out,
 * "Skip for now"), a rail of steps grouped by section, and one card-based form per step. Step completion is derived from
 * the real stores (useSetup); the page only remembers who skipped it. The step lives in the URL hash
 * (`/setup#invite`), so a step can be linked to. Owners and administrators only.
 */
export function SetupPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const canRun = useCanRunSetup();
  if (loading) return <div className="mv-page" style={{ display: 'grid', minHeight: '100vh', placeItems: 'center' }}><img className="mv-brand-logo" src={maveraLogo} alt="Mavera" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!canRun) return <SetupDenied />;
  return <SetupWizard userId={user?.id} />;
}

function SetupDenied() {
  return (
    <div className="mv-page mv-setup-denied">
      <section className="mv-empty" role="status">
        <h1>Setup is for owners and administrators</h1>
        <p>Ask the owner of your organisation to finish setting up Mavera. You can still use everything your role allows.</p>
        <Link className="mv-primary-button" to="/">Go to the dashboard</Link>
      </section>
    </div>
  );
}

function SetupWizard({ userId }: { userId: string | undefined }) {
  const { user, logout, modules } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const compact = useCompactLayout();
  const { model, profile, refresh } = useSetup();
  const [memory, setMemory] = useState<SetupMemory>(() => readSetupMemory(userId));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const continueRef = useRef<ContinueHandler | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const ids = useMemo(() => model.steps.map((step) => step.id), [model.steps]);
  const firstOpen = model.steps.find((step) => !step.complete && step.id !== 'review')?.id ?? 'review';
  const [activeId, select] = useHashTab<SetupStepId>(ids, firstOpen);
  const index = model.steps.findIndex((step) => step.id === activeId);
  const step = model.steps[index];
  const previous = model.steps[index - 1];
  const next = model.steps[index + 1];
  const isLast = !next;

  const orgName = user?.orgName?.trim() || 'Your organisation';
  const profileDraft = useProfileDraft(profile, orgName);
  const register = useCallback((handler: ContinueHandler | null) => { continueRef.current = handler; }, []);

  // A bare /setup lands on the first step that is still open, and the address says so (so Back and links keep working).
  const hasHash = useLocation().hash !== '';
  useEffect(() => { if (!hasHash) select(firstOpen); /* once, on arrival */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opening a step is remembered (so the review can tell "skipped" from "not started"); focus moves to its heading.
  useEffect(() => {
    if (!memory.visited.includes(activeId)) setMemory(writeSetupMemory(userId, { visited: [...memory.visited, activeId] }));
    if (firstRender.current) { firstRender.current = false; return; }
    headingRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the step changes
  }, [activeId]);

  const go = (id: SetupStepId) => { setDrawerOpen(false); select(id); };
  const finish = () => navigate('/');
  const onContinue = () => {
    const ok = continueRef.current ? continueRef.current() : true;
    if (!ok) return;
    if (next) go(next.id);
  };
  const skip = () => {
    writeSetupMemory(userId, { skipped: true, redirected: true });
    navigate('/');
  };
  const signOut = async () => {
    const ok = await confirm({ title: 'Log out of Mavera?', variant: 'logout', okText: 'Log out' });
    if (!ok) return;
    await logout();
    navigate('/login');
  };

  const displayName = user?.name || user?.email?.split('@')[0] || 'Account';
  const company = companyOf(profile, orgName);
  const rail = <SetupRail model={model} active={activeId} onSelect={go} company={company} />;

  if (!step) return <Navigate to="/" replace />;
  const section = model.groups.find((group) => group.id === step.group)?.label ?? '';

  return (
    <div className="mv-page mv-setup">
      <a className="mv-skip-link" href="#mv-setup-main">Skip to the form</a>
      <header className="mv-setup-top">
        <div className="mv-setup-top-brand">
          <img className="mv-brand-logo mv-setup-logo-full" src={maveraLogo} alt="Mavera" />
          <img className="mv-brand-logo mv-setup-logo-mark" src={maveraEmblem} alt="" aria-hidden />
        </div>
        <div className="mv-setup-progress">
          <div className="mv-setup-progress-head">
            <strong>Setup progress</strong>
            <span className="mv-muted" aria-live="polite">{model.done}/{model.total} · {model.percent}% · {minutesLabel(model.minutesLeft)}</span>
          </div>
          <div className="mv-setup-bar" role="progressbar" aria-label="Setup progress" aria-valuemin={0} aria-valuemax={model.total} aria-valuenow={model.done} aria-valuetext={`${model.done} of ${model.total} steps, ${model.percent}%`}>
            <span style={{ width: `${model.percent}%` }} />
          </div>
        </div>
        <div className="mv-setup-top-tools">
          <span className="mv-setup-user" title={user?.email}>
            <span className="mv-avatar" aria-hidden>{displayName.slice(0, 1).toUpperCase()}</span>
            <span className="mv-setup-user-name">{displayName}</span>
          </span>
          <button type="button" className="mv-quiet-button" onClick={signOut}>Sign out</button>
          <button type="button" className="mv-secondary-button" onClick={skip}>Skip for now</button>
        </div>
      </header>

      {compact && (
        <div className="mv-setup-stepper" aria-label="Setup steps">
          <button type="button" className="mv-icon-button" aria-label="Show all steps" aria-haspopup="dialog" onClick={() => setDrawerOpen(true)}><MenuIcon size={20} /></button>
          <ol className="mv-setup-stepper-dots">
            {model.steps.map((item) => (
              <li key={item.id} className={`mv-setup-stepper-dot${item.id === activeId ? ' is-active' : ''}`}>
                <button type="button" className="mv-setup-stepper-button" aria-label={`${item.title}${item.complete ? ', complete' : ''}`} aria-current={item.id === activeId ? 'step' : undefined} onClick={() => go(item.id)}>
                  <StepMark step={item} active={item.id === activeId} />
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mv-setup-body">
        {!compact && <aside className="mv-setup-rail">{rail}</aside>}
        <main className="mv-setup-main" id="mv-setup-main" tabIndex={-1}>
          <div className="mv-setup-main-head">
            <div className="mv-setup-main-title">
              <p className="mv-eyebrow">Step {step.number} of {model.steps.length} · {section}</p>
              <div className="mv-setup-title-row">
                <h1 className="mv-setup-title" ref={headingRef} tabIndex={-1}>{step.title}</h1>
                <Tooltip content={step.summary} placement="bottom">
                  <button type="button" className="mv-icon-button mv-setup-info" aria-label={`About ${step.title}: ${step.summary}`}><InfoIcon size={16} /></button>
                </Tooltip>
                {step.complete && <span className="mv-status mv-status--success">Complete</span>}
              </div>
              <p className="mv-subtitle">{STEP_INTRO[step.id]}</p>
            </div>
            <div className="mv-setup-nav-buttons">
              <button type="button" className="mv-secondary-button" disabled={!previous} onClick={() => previous && go(previous.id)}>
                <ChevronLeftIcon size={14} style={{ marginRight: '0.25rem' }} />Previous
              </button>
              {next && (
                <button type="button" className="mv-primary-button" onClick={() => go(next.id)}>
                  Next: {next.title}<ChevronRightIcon size={14} style={{ marginLeft: '0.25rem' }} />
                </button>
              )}
            </div>
          </div>

          <div className="mv-setup-content" key={step.id}>
            {step.id === 'profile' && <ProfileStep profile={profileDraft} register={register} onSubmit={onContinue} />}
            {step.id === 'invite' && <InviteStep register={register} currentUserId={userId} />}
            {step.id === 'notifications' && <NotificationsStep register={register} defaultEmail={user?.email} onChanged={refresh} />}
            {step.id === 'cloud' && <CloudStep register={register} modules={modules} onChanged={refresh} />}
            {step.id === 'budget' && <BudgetStep register={register} onChanged={refresh} openStep={go} />}
            {step.id === 'sap' && <SapStep register={register} onChanged={refresh} />}
            {step.id === 'review' && <ReviewStep register={register} model={model} profile={profile} visited={memory.visited} onOpenStep={go} onFinish={finish} />}
          </div>

          <div className="mv-setup-actions">
            <span className="mv-muted">{isLast ? `${model.done} of ${model.total} steps done` : `Step ${step.number} of ${model.steps.length}`}</span>
            <button type="button" className="mv-primary-button mv-setup-continue" onClick={onContinue}>{isLast ? 'Go to dashboard' : 'Continue'}</button>
          </div>
        </main>
      </div>

      {compact && drawerOpen && <StepDrawer onClose={() => setDrawerOpen(false)}>{rail}</StepDrawer>}
      <ConnectDialogHost />
      <TooltipProvider />
    </div>
  );
}

function StepDrawer({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const ref = useModalOverlay<HTMLElement>(onClose);
  return (
    <div className="mv-setup-drawer-backdrop" onClick={onClose}>
      <section ref={ref} className="mv-setup-drawer" role="dialog" aria-modal="true" aria-label="Setup steps" onClick={(event) => event.stopPropagation()}>
        <div className="mv-setup-drawer-head">
          <strong>Setup steps</strong>
          <button type="button" className="mv-icon-button" aria-label="Close the step list" data-autofocus onClick={onClose}><CloseIcon size={16} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}
