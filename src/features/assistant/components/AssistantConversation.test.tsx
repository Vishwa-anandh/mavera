import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAssistantConversation } from '../model/useAssistantConversation';
import { AssistantConversation } from './AssistantConversation';

function Harness({ pathname }: { pathname?: string } = {}) {
  const { messages, draft, setDraft, send, flowGuide } = useAssistantConversation(pathname);
  return <AssistantConversation messages={messages} draft={draft} onDraftChange={setDraft} onSend={send} flowGuide={flowGuide} />;
}

describe('AssistantConversation', () => {
  it('shows suggestion chips before any message is sent, and sends one on click', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByText('Try asking')).toBeInTheDocument();
    const chip = screen.getByRole('button', { name: 'System health' });
    await user.click(chip);

    expect(screen.getByText('System health')).toBeInTheDocument();
    expect(screen.getByText(/SAP systems: 3 healthy, 1 warning, 1 critical/)).toBeInTheDocument();
    expect(screen.getByText(/Sample data/)).toBeInTheDocument();
  });

  it('sends a typed question and clears the input', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByLabelText('Ask the AI Assistant');
    await user.type(input, 'Tell me a joke about clouds');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getByText('Tell me a joke about clouds')).toBeInTheDocument();
    expect(screen.getByText(/no live model connected yet/)).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it("proactively offers the page's own flow guide and gives the real walkthrough when asked", async () => {
    const user = userEvent.setup();
    render(<Harness pathname="/budgets" />);

    expect(screen.getByText('Need a hand setting up a budget or alert on this page?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Help me create a budget' }));

    expect(screen.getByText(/Choose a scope/)).toBeInTheDocument();
    expect(screen.queryByText(/no live model connected yet/)).not.toBeInTheDocument();
  });

  it('shows no flow-guide offer on a page without one', () => {
    render(<Harness pathname="/dashboard" />);
    expect(screen.queryByText(/Need a hand/)).not.toBeInTheDocument();
  });

  it('lists the page’s task tours and starts the one clicked', async () => {
    const user = userEvent.setup();
    const onStartFlow = vi.fn();
    const Page = () => {
      const { messages, draft, setDraft, send, flowGuide } = useAssistantConversation('/users');
      return <AssistantConversation messages={messages} draft={draft} onDraftChange={setDraft} onSend={send} flowGuide={flowGuide} onStartFlow={onStartFlow} />;
    };
    render(<Page />);
    await user.click(screen.getByRole('button', { name: 'Add a user' }));
    expect(onStartFlow).toHaveBeenCalledWith(expect.objectContaining({ key: 'add-user' }));
  });

  it('hides the "New here?" prompt for returning users but keeps the task tours', () => {
    const Page = () => {
      const { messages, draft, setDraft, send, flowGuide } = useAssistantConversation('/users');
      return <AssistantConversation messages={messages} draft={draft} onDraftChange={setDraft} onSend={send} flowGuide={flowGuide} hideFlowPrompt onStartFlow={() => {}} />;
    };
    render(<Page />);
    expect(screen.queryByRole('button', { name: 'Help me manage users' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deactivate or reactivate a user' })).toBeInTheDocument();
  });
});

describe('AssistantConversation welcome', () => {
  it('greets a new organisation first and offers to start the checklist or put it off', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const onDismiss = vi.fn();
    render(
      <AssistantConversation
        messages={[]}
        draft=""
        onDraftChange={() => {}}
        onSend={() => {}}
        welcome={{ text: 'Welcome to Mavera, Nora.', actionLabel: 'Start the checklist', onAction, onDismiss }}
      />,
    );
    expect(screen.getByText('Welcome to Mavera, Nora.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start the checklist' }));
    expect(onAction).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Not now' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows no welcome unless one is given, and not once a conversation has started', () => {
    const { rerender } = render(<AssistantConversation messages={[]} draft="" onDraftChange={() => {}} onSend={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Not now' })).not.toBeInTheDocument();
    rerender(
      <AssistantConversation
        messages={[{ id: 'u-0', role: 'user', text: 'hi' }]}
        draft=""
        onDraftChange={() => {}}
        onSend={() => {}}
        welcome={{ text: 'Welcome', actionLabel: 'Go', onAction: () => {}, onDismiss: () => {} }}
      />,
    );
    expect(screen.queryByText('Welcome')).not.toBeInTheDocument();
  });
});
