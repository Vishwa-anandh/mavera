import { useEffect, useRef, useState } from 'react';
import { flowGuideForPath, type FlowGuide } from './flowGuides';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export const ASSISTANT_SUGGESTIONS = ['System health', 'Cost optimization', 'Generate report'];

interface AssistantModules {
  cloudCost: boolean;
  sapMonitoring: boolean;
}

/** Drops suggestions for modules the org isn't subscribed to — "Generate
 * report" stays, since Reports isn't gated by a module entitlement. */
export function assistantSuggestions(modules: AssistantModules): string[] {
  return [
    modules.sapMonitoring && 'System health',
    modules.cloudCost && 'Cost optimization',
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

const NO_MODEL_REPLY = 'This prototype build has no live model connected yet, so I can’t answer that from real data. Once connected, answers here will cite the specific systems or costs behind them.';

/**
 * Shared behind the AI Assistant drawer, its dedicated nav page, and the
 * dashboard's embedded widget. No live model is connected in this
 * prototype, so every free-form question gets a canned, honest reply rather
 * than a fabricated answer (MAVERA_DESIGN_SYSTEM.md §11.8). The one
 * exception is a page's own flow-guide chip (see flowGuides.ts): that's
 * authored walkthrough content Mavera owns, not a claim about live data, so
 * it gets a real, useful reply.
 */
export function useAssistantConversation(pathname?: string) {
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
    const reply = flowGuide && trimmed === flowGuide.chipLabel ? flowGuide.reply : NO_MODEL_REPLY;
    setMessages((current) => [
      ...current,
      { id: `u-${current.length}`, role: 'user', text: trimmed },
      { id: `a-${current.length}`, role: 'assistant', text: reply },
    ]);
    setDraft('');
  };

  return { messages, draft, setDraft, send, flowGuide };
}
