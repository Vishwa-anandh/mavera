import { useAuth } from '../../auth';
import { assistantIntroLabel, assistantSuggestions, useAssistantConversation } from '../model/useAssistantConversation';
import { AssistantConversation } from '../components/AssistantConversation';
import { PageHeader } from '../../../shared/ui/PageHeader';

export function AiAssistantPage() {
  const { modules } = useAuth();
  const { messages, draft, setDraft, send } = useAssistantConversation(undefined, modules);
  const introLabel = assistantIntroLabel(modules);

  return (
    <div>
      <PageHeader title="AI Assistant" subtitle={<>{introLabel}</>} />
      <section className="mv-panel">
        <AssistantConversation
          messages={messages}
          draft={draft}
          onDraftChange={setDraft}
          onSend={send}
          introLabel={introLabel}
          suggestions={assistantSuggestions(modules)}
        />
      </section>
    </div>
  );
}
