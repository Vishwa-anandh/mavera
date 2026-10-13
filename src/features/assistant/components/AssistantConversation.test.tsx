import { describe, it, expect } from 'vitest';
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
    expect(screen.getByText(/no live model connected yet/)).toBeInTheDocument();
  });

  it('sends a typed question and clears the input', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByLabelText('Ask the AI Assistant');
    await user.type(input, 'Show me failed IDocs today');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getByText('Show me failed IDocs today')).toBeInTheDocument();
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
});
