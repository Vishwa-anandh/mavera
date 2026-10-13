import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import { useAuth } from '../../auth';
import { assistantIntroLabel, assistantSuggestions, useAssistantConversation } from '../model/useAssistantConversation';
import { AssistantConversation } from '../components/AssistantConversation';

export function AiAssistantPage() {
  const { modules } = useAuth();
  const { messages, draft, setDraft, send } = useAssistantConversation();
  const introLabel = assistantIntroLabel(modules);

  return (
    <div>
      <AppBreadcrumb items={[{ label: 'AI Assistant' }]} />
      <div className="mv-page-heading">
        <div>
          <h1 className="mv-title">AI Assistant</h1>
          <p className="mv-subtitle">{introLabel}</p>
        </div>
      </div>
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
