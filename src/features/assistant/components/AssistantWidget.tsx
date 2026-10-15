import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CloseIcon, SparkleIcon } from '../../../shared/ui/icons';
import { useAuth } from '../../auth';
import { assistantIntroLabel, assistantSuggestions, useAssistantConversation } from '../model/useAssistantConversation';
import { AssistantConversation } from './AssistantConversation';
import { AssistantLauncherFace } from './AssistantLauncherFace';
import { GuidedTour } from './GuidedTour';
import { TourPicker } from './TourPicker';
import type { FlowGuide, FlowTour } from '../model/flowGuides';

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
  const { modules } = useAuth();
  const location = useLocation();
  const { messages, draft, setDraft, send, flowGuide } = useAssistantConversation(location.pathname, modules);
  const [open, setOpen] = useState(false);
  const [tour, setTour] = useState<{ guide: FlowGuide; flow?: FlowTour } | null>(null);
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
    setTour({ guide, flow });
    hideTips();
  };

  // A tour belongs to the page it was started on.
  useEffect(() => { setTour(null); setPicking(false); }, [location.pathname]);
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

  return (
    <aside className="mv-ai-assistant" aria-label="Mavera AI Assistant">
      {open && (
        <section className="mv-ai-assistant-panel" aria-labelledby="ai-assistant-title">
          <header className="mv-ai-assistant-header">
            <div className="mv-ai-assistant-title">
              <span className="mv-ai-assistant-avatar"><AssistantLauncherFace className="mv-bot-face--sm" /></span>
              <span><strong id="ai-assistant-title">Mavera AI</strong><small>Ask about systems or costs</small></span>
            </div>
            {flowGuide && flowGuide.steps.length > 0 && (
              <button type="button" className="mv-ai-assistant-tour" title="Choose a guided tour for this page" aria-pressed={picking} onClick={() => setPicking((p) => !p)}>
                <SparkleIcon size={14} /> Tour
              </button>
            )}
            <button type="button" className="mv-ai-assistant-close" aria-label="Close AI Assistant" onClick={() => setOpen(false)}>
              <CloseIcon size={18} />
            </button>
          </header>
          {picking && flowGuide ? (
            <TourPicker guide={flowGuide} onPick={(flow) => startTour(flowGuide, flow)} onBack={() => setPicking(false)} />
          ) : (
          <AssistantConversation
            messages={messages}
            draft={draft}
            onDraftChange={setDraft}
            onSend={onSend}
            introLabel={assistantIntroLabel(modules)}
            suggestions={assistantSuggestions(modules)}
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
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        {open ? <CloseIcon size={24} aria-hidden /> : <AssistantLauncherFace />}
      </button>
      {tour && <GuidedTour key={`${tour.guide.key}:${tour.flow?.key ?? ''}`} pageName={tour.guide.pageName} tourName={tour.flow?.label} steps={tour.flow?.steps ?? tour.guide.steps} onClose={() => setTour(null)} />}
    </aside>
  );
}
