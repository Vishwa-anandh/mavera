import { useEffect, useRef, useState } from 'react';
import { flowGuideForPath, type FlowGuide } from './flowGuides';
import { answerFromDemoData, answerableTopics } from './assistantAnswers';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export const ASSISTANT_SUGGESTIONS = ['What is our cloud spend this month?', 'System health', 'Top savings', 'Generate report'];

interface AssistantModules {
  cloudCost: boolean;
  sapMonitoring: boolean;
}

/** Drops suggestions for modules the org isn't subscribed to — "Generate
 * report" stays, since Reports isn't gated by a module entitlement. */
export function assistantSuggestions(modules: AssistantModules): string[] {
  return [
    modules.cloudCost && 'What is our cloud spend this month?',
    modules.sapMonitoring && 'System health',
    modules.cloudCost && 'Top savings',
    modules.sapMonitoring && 'Unread SAP alerts',
    'Generate report',
  ].filter((item): item is string => Boolean(item));
}

/** Matches the copy to whichever modules are actually enabled, so an org
 * on fewer than both isn't invited to ask about ones it can't open. */
export function assistantIntroLabel(modules: AssistantModules): string {
  const topics = [
    modules.sapMonitoring && 'SAP systems',
    modules.cloudCost && 'cloud costs',
  ].filter((item): item is string => Boolean(item));
  if (topics.length === 0) return 'Ask me anything about your Mavera workspace.';
  return `Ask anything about your ${topics.join(', ').replace(/, ([^,]*)$/, ' or $1')}.`;
}

/** Reply for a question the sample-data answers don't cover; says what can be asked instead. */
function noModelReply(modules: AssistantModules): string {
  const topics = answerableTopics(modules);
  return `This prototype build has no live model connected yet, so I can only answer from sample data.${topics.length ? ` Try asking about: ${topics.join('; ')}.` : ''} For how a page works, use the help button at the top of the chat.`;
}

/**
 * Shared behind the AI Assistant drawer, its dedicated nav page, and the dashboard's embedded widget.
 * No live model is connected in this prototype, so free-form questions are answered from the prototype's
 * sample data when they match a topic (see assistantAnswers.ts), labelled as sample data, and otherwise get
 * an honest "not connected" reply that says what can be asked (MAVERA_DESIGN_SYSTEM.md §11.8). A page's own
 * help chip (see flowGuides.ts) gets its authored walkthrough; the widget also starts the on-page tour.
 */
export function useAssistantConversation(pathname?: string, modules: AssistantModules = { cloudCost: true, sapMonitoring: true }) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [draft, setDraft] = useState('');
  const flowGuide: FlowGuide | undefined = pathname ? flowGuideForPath(pathname) : undefined;
  const flowGuideKey = flowGuide?.key;

  // Landing on a different page's flow starts a fresh conversation, so that
  // page's own proactive offer shows again instead of staying buried under
  // whatever was asked earlier on a different page.
  const previousFlowGuideKey = useRef(flowGuideKey);
  useEffect(() => {
    if (previousFlowGuideKey.current !== flowGuideKey) {
      previousFlowGuideKey.current = flowGuideKey;
      setMessages([]);
    }
  }, [flowGuideKey]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const reply = flowGuide && trimmed === flowGuide.chipLabel
      ? flowGuide.reply
      : answerFromDemoData(trimmed, modules) ?? noModelReply(modules);
    setMessages((current) => [
      ...current,
      { id: `u-${current.length}`, role: 'user', text: trimmed },
      { id: `a-${current.length}`, role: 'assistant', text: reply },
    ]);
    setDraft('');
  };

  return { messages, draft, setDraft, send, flowGuide };
}
