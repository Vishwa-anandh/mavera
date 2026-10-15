import type { FormEvent } from 'react';
import { SendIcon } from '../../../shared/ui/icons';
import type { AssistantMessage } from '../model/useAssistantConversation';
import { ASSISTANT_SUGGESTIONS } from '../model/useAssistantConversation';
import type { FlowGuide } from '../model/flowGuides';

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
}

export function AssistantConversation({ messages, draft, onDraftChange, onSend, introLabel, suggestions = ASSISTANT_SUGGESTIONS, flowGuide }: AssistantConversationProps) {
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSend(draft);
  };

  return (
    <div className="mv-assistant-conversation" style={{ display: 'grid', gap: 12 }}>
      <div className="mv-assistant-messages" style={{ overflowY: 'auto', display: 'grid', gap: 12, alignContent: 'start', paddingRight: 4 }}>
        {messages.length === 0 && (
          <div style={{ display: 'grid', gap: 10 }}>
            {flowGuide && (
              <div className="mv-assistant-message mv-assistant-message--assistant mv-assistant-flow-prompt">
                <span className="mv-sr-only">Assistant</span>
                <p style={{ margin: 0 }}>{flowGuide.prompt}</p>
                <button type="button" className="mv-chip mv-chip--primary" style={{ marginTop: 10 }} onClick={() => onSend(flowGuide.chipLabel)}>
                  {flowGuide.chipLabel}
                </button>
              </div>
            )}
            <p className="mv-muted">{introLabel ?? 'Ask about your SAP systems or cloud costs.'}</p>
            <div>
              <p className="mv-muted mv-assistant-try">Try asking</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
