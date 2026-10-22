import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CloseIcon, SparkleIcon } from '../../../shared/ui/icons';
import { workspaceRepository } from '../../../data-access';
import { useAuth } from '../../auth';
import { openConnectDialog, useOnboardingProgress } from '../../workspace';
import { useAssistantIntro } from '../model/useAssistantIntro';
import { assistantIntroLabel, assistantSuggestions, useAssistantConversation } from '../model/useAssistantConversation';
import { AssistantConversation } from './AssistantConversation';
import { AssistantLauncherFace } from './AssistantLauncherFace';
import { GuidedTour } from './GuidedTour';
import { TourPicker } from './TourPicker';
import type { FlowGuide, FlowTour, TourStep } from '../model/flowGuides';
import { OPEN_ASSISTANT_EVENT, SHOW_CHECKLIST_EVENT, START_COACH_EVENT, START_PAGE_TOUR_EVENT } from '../model/assistantCommands';
import { onboardingFlowByKey, onboardingFlowsFor, type OnboardingFlow } from '../model/onboardingFlows';

/** The tour or live guide on screen. A guide started from the checklist or the chat follows the person from page to page. */
interface ActiveTour {
  key: string;
  pageName: string;
  tourName?: string;
  steps: TourStep[];
  /** A live guide (not a page tour): it stays when the page changes, and finishing it does not count as taking the tour. */
  coach: boolean;
}

const TIPS_KEY = 'mavera.assistant.flowPromptHidden';

function readTipsHidden(): boolean {
  try { return window.localStorage.getItem(TIPS_KEY) === '1'; } catch { return false; }
}

/**
 * Persistent assistant launcher for authenticated Mavera screens. The
 * compact button keeps the assistant available without taking dashboard
 * space; the conversation opens only when a user asks for it. On a page
 * with its own flow guide (see flowGuides.ts), it proactively offers a
 * walkthrough for that page's task instead of only the generic suggestions.
 */
export function AssistantWidget() {
  const { modules, user } = useAuth();
  const intro = useAssistantIntro(user?.id);
  const firstName = (user?.name ?? '').split(' ')[0];
  const location = useLocation();
  const navigate = useNavigate();
  const { messages, draft, setDraft, send, flowGuide } = useAssistantConversation(location.pathname, modules);
  // A new organisation is offered the setup checklist (chips first, and a welcome on the first visit).
  const progress = useOnboardingProgress(modules);
  const setup = {
    show: progress.relevant,
    cloudOpen: progress.steps.some((step) => step.id === 'cloud' && !step.done),
    sapOpen: progress.steps.some((step) => step.id === 'sap' && !step.done),
  };
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const welcomeShown = intro.first && progress.relevant && !welcomeDismissed;
  const [open, setOpen] = useState(false);
  const [tour, setTour] = useState<ActiveTour | null>(null);
  // New users get a "New here?" prompt; once they've taken a tour or dismissed it, it gives way to a small
  // "Page tour" button in the header, so returning users aren't nagged but can still get help on any page.
  const [picking, setPicking] = useState(false);
  const [tipsHidden, setTipsHidden] = useState(readTipsHidden);
  const hideTips = () => {
    setTipsHidden(true);
    try { window.localStorage.setItem(TIPS_KEY, '1'); } catch { /* private mode: hidden for this visit only */ }
  };
  const startTour = (guide: FlowGuide, flow?: FlowTour) => {
    setOpen(false);
    setPicking(false);
    setTour({ key: `${guide.key}:${flow?.key ?? ''}`, pageName: guide.pageName, tourName: flow?.label, steps: flow?.steps ?? guide.steps, coach: false });
    hideTips();
  };
  const startCoach = (flow: OnboardingFlow) => {
    setOpen(false);
    setPicking(false);
    setTour({ key: `coach:${flow.key}`, pageName: 'Getting started', tourName: flow.label, steps: flow.steps, coach: true });
    hideTips();
  };

  // A page tour belongs to the page it was started on; a live guide follows the person to the pages it sends them to.
  useEffect(() => { setTour((current) => (current?.coach ? current : null)); setPicking(false); }, [location.pathname]);
  useEffect(() => { if (!open) setPicking(false); }, [open]);

  // The page's help chip keeps its written walkthrough in the chat and starts the on-page tour.
  const onSend = (text: string) => {
    send(text);
    if (flowGuide && flowGuide.steps.length > 0 && text.trim() === flowGuide.chipLabel) {
      startTour(flowGuide);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // The command palette (Ctrl+K) can open the chat, or start the tour of the page being viewed.
  const latest = useRef({ flowGuide, startTour, startCoach, modules, navigate, finishIntro: intro.finish });
  useEffect(() => { latest.current = { flowGuide, startTour, startCoach, modules, navigate, finishIntro: intro.finish }; });
  useEffect(() => {
    const openChat = () => { latest.current.finishIntro(); setOpen(true); };
    const startPageTour = () => {
      const { flowGuide: guide, startTour: start } = latest.current;
      if (guide && guide.steps.length > 0) start(guide); else openChat();
    };
    // The checklist card, the profile menu and the chat ask for a live guide or the checklist by name.
    const startCoachFlow = (event: Event) => {
      const flow = onboardingFlowByKey((event as CustomEvent<{ flow: string }>).detail?.flow ?? '');
      const { modules: subscribed, startCoach: start } = latest.current;
      if (flow && (!flow.module || subscribed[flow.module])) start(flow);
    };
    const showChecklist = () => {
      workspaceRepository.dismissOnboarding(false);
      latest.current.navigate('/');
      setOpen(false);
    };
    window.addEventListener(OPEN_ASSISTANT_EVENT, openChat);
    window.addEventListener(START_PAGE_TOUR_EVENT, startPageTour);
    window.addEventListener(START_COACH_EVENT, startCoachFlow);
    window.addEventListener(SHOW_CHECKLIST_EVENT, showChecklist);
    return () => {
      window.removeEventListener(OPEN_ASSISTANT_EVENT, openChat);
      window.removeEventListener(START_PAGE_TOUR_EVENT, startPageTour);
      window.removeEventListener(START_COACH_EVENT, startCoachFlow);
      window.removeEventListener(SHOW_CHECKLIST_EVENT, showChecklist);
    };
  }, []);

  const startWelcome = () => {
    setWelcomeDismissed(true);
    onSend('Start the checklist');
  };

  return (
    <aside className={`mv-ai-assistant${intro.playing ? ' is-intro' : ''}`} aria-label="Mavera AI Assistant">
      {intro.playing && (
        <p className="mv-ai-intro-bubble" role="status">
          {firstName ? `Hi ${firstName}, I’m Mavera AI.` : 'Hi, I’m Mavera AI.'} {welcomeShown ? 'I can help you get set up.' : 'Ask me about your costs or your systems.'}
        </p>
      )}
      {open && (
        <section className="mv-ai-assistant-panel" aria-labelledby="ai-assistant-title">
          <header className="mv-ai-assistant-header">
            <div className="mv-ai-assistant-title">
              <span className="mv-ai-assistant-avatar"><AssistantLauncherFace className="mv-bot-face--sm" /></span>
              <span><strong id="ai-assistant-title">Mavera AI</strong><small>Ask about systems or costs</small></span>
            </div>
            <button type="button" className="mv-ai-assistant-tour" title="Choose a guided tour or a getting-started guide" aria-pressed={picking} onClick={() => setPicking((p) => !p)}>
              <SparkleIcon size={14} /> Tour
            </button>
            <button type="button" className="mv-ai-assistant-close" aria-label="Close AI Assistant" onClick={() => setOpen(false)}>
              <CloseIcon size={18} />
            </button>
          </header>
          {picking ? (
            <TourPicker
              guide={flowGuide && flowGuide.steps.length > 0 ? flowGuide : undefined}
              onPick={(flow) => flowGuide && startTour(flowGuide, flow)}
              gettingStarted={onboardingFlowsFor(modules)}
              onPickFlow={startCoach}
              onBack={() => setPicking(false)}
            />
          ) : (
          <AssistantConversation
            messages={messages}
            draft={draft}
            onDraftChange={setDraft}
            onSend={onSend}
            introLabel={assistantIntroLabel(modules)}
            suggestions={assistantSuggestions(modules, setup)}
            welcome={welcomeShown ? {
              text: `Welcome to Mavera${firstName ? `, ${firstName}` : ''}. Your organisation is new, so nothing is connected yet. I can walk you through setting it up, one step at a time, and you stay in control.`,
              actionLabel: 'Start the checklist',
              onAction: startWelcome,
              onDismiss: () => setWelcomeDismissed(true),
            } : undefined}
            flowGuide={flowGuide}
            hideFlowPrompt={tipsHidden}
            onDismissFlowPrompt={hideTips}
            onStartFlow={(flow) => flowGuide && startTour(flowGuide, flow)}
          />
          )}
        </section>
      )}
      <button
        type="button"
        className="mv-ai-assistant-launcher"
        aria-label={open ? 'Close AI Assistant' : 'Open AI Assistant'}
        aria-expanded={open}
        aria-controls="ai-assistant-title"
        onAnimationEnd={(event) => { if (event.animationName === 'mv-ai-intro-fly') intro.finish(); }}
        onClick={() => { intro.finish(); setOpen((isOpen) => !isOpen); }}
      >
        {open ? <CloseIcon size={24} aria-hidden /> : <AssistantLauncherFace />}
      </button>
      {tour && (
        <GuidedTour
          key={tour.key}
          pageName={tour.pageName}
          tourName={tour.tourName}
          steps={tour.steps}
          pathname={location.pathname}
          onNavigate={(to) => navigate(to)}
          onOpenConnect={(provider) => openConnectDialog(provider)}
          onFinish={tour.coach ? undefined : () => workspaceRepository.markTourDone()}
          onClose={() => setTour(null)}
        />
      )}
    </aside>
  );
}
