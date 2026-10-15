import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CloseIcon } from '../../../shared/ui/icons';
import { useAuth } from '../../auth';
import { assistantIntroLabel, assistantSuggestions, useAssistantConversation } from '../model/useAssistantConversation';
import { AssistantConversation } from './AssistantConversation';
import { AssistantLauncherFace } from './AssistantLauncherFace';

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
  const { messages, draft, setDraft, send, flowGuide } = useAssistantConversation(location.pathname);
  const [open, setOpen] = useState(false);

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
            <button type="button" className="mv-ai-assistant-close" aria-label="Close AI Assistant" onClick={() => setOpen(false)}>
              <CloseIcon size={18} />
            </button>
          </header>
          <AssistantConversation
            messages={messages}
            draft={draft}
            onDraftChange={setDraft}
            onSend={send}
            introLabel={assistantIntroLabel(modules)}
            suggestions={assistantSuggestions(modules)}
            flowGuide={flowGuide}
          />
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
    </aside>
  );
}
