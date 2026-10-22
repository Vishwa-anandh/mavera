import type { FormEvent } from 'react';
import { SendIcon } from '../../../shared/ui/icons';
import type { AssistantMessage } from '../model/useAssistantConversation';
import { ASSISTANT_SUGGESTIONS } from '../model/useAssistantConversation';
import type { FlowGuide, FlowTour } from '../model/flowGuides';

interface AssistantConversationProps {
  messages: AssistantMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: (text: string) => void;
  introLabel?: string;
  suggestions?: string[];
  /** The current page's own walkthrough, offered proactively above the
   * generic suggestions (see flowGuides.ts). */
  flowGuide?: FlowGuide;
  /** Set by the widget once the person has seen or dismissed the "New here?" prompt; the page-tour button in the
   * panel header stays available either way. */
  hideFlowPrompt?: boolean;
  /** Starts one of the page's task tours (guide.flows). */
  onStartFlow?: (flow: FlowTour) => void;
  /** When given, the prompt offers "Don't show this again". */
  onDismissFlowPrompt?: () => void;
  /** A first-visit greeting from the assistant that offers the setup checklist; shown above everything else until a message is sent. */
  welcome?: { text: string; actionLabel: string; onAction: () => void; onDismiss: () => void };
}

export function AssistantConversation({ messages, draft, onDraftChange, onSend, introLabel, suggestions = ASSISTANT_SUGGESTIONS, flowGuide, hideFlowPrompt = false, onDismissFlowPrompt, onStartFlow, welcome }: AssistantConversationProps) {
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSend(draft);
  };

  return (
    <div className="mv-assistant-conversation" style={{ display: 'grid', gap: '0.75rem' }}>
      <div className="mv-assistant-messages" style={{ overflowY: 'auto', display: 'grid', gap: '0.75rem', alignContent: 'start', paddingRight: '0.25rem' }}>
        {messages.length === 0 && (
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {welcome && (
              <div className="mv-assistant-message mv-assistant-message--assistant mv-assistant-welcome">
                <span className="mv-sr-only">Assistant</span>
                <p style={{ margin: 0 }}>{welcome.text}</p>
                <div className="mv-assistant-welcome-actions">
                  <button type="button" className="mv-chip mv-chip--primary" onClick={welcome.onAction}>{welcome.actionLabel}</button>
                  <button type="button" className="mv-quiet-button" onClick={welcome.onDismiss}>Not now</button>
                </div>
              </div>
            )}
            {flowGuide && !hideFlowPrompt && !welcome && (
              <div className="mv-assistant-message mv-assistant-message--assistant mv-assistant-flow-prompt">
                <span className="mv-sr-only">Assistant</span>
                <p style={{ margin: 0 }}>{flowGuide.prompt}</p>
                <button type="button" className="mv-chip mv-chip--primary" style={{ marginTop: '0.625rem' }} onClick={() => onSend(flowGuide.chipLabel)}>
                  {flowGuide.chipLabel}
                </button>
                {onDismissFlowPrompt && (
                  <button type="button" className="mv-quiet-button mv-assistant-flow-dismiss" onClick={onDismissFlowPrompt}>Don’t show this again</button>
                )}
              </div>
            )}
            {flowGuide?.flows && flowGuide.flows.length > 0 && onStartFlow && (
              <div>
                <p className="mv-muted mv-assistant-try">Guided tours on this page</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {flowGuide.flows.map((flow) => (
                    <button key={flow.key} type="button" className="mv-chip mv-chip--tour" onClick={() => onStartFlow(flow)}>{flow.label}</button>
                  ))}
                </div>
              </div>
            )}
            <p className="mv-muted">{introLabel ?? 'Ask about your SAP systems or cloud costs.'}</p>
            <div>
              <p className="mv-muted mv-assistant-try">Try asking</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {suggestions.map((suggestion) => (
                  <button key={suggestion} type="button" className="mv-chip" onClick={() => onSend(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`mv-assistant-message mv-assistant-message--${message.role}`} style={{ display: 'grid', gap: 2 }}>
            <span className="mv-sr-only">{message.role === 'user' ? 'You' : 'Assistant'}</span>
            <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{message.text}</p>
          </div>
        ))}
      </div>
      <form className="mv-assistant-composer" onSubmit={onSubmit}>
        <input
          aria-label="Ask the AI Assistant"
          placeholder="e.g., Show me this month’s cloud spend"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
        />
        <button type="submit" className="mv-assistant-send" aria-label="Send" disabled={!draft.trim()}><SendIcon size={18} /></button>
      </form>
    </div>
  );
}
