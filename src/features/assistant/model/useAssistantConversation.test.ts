import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { assistantIntroLabel, assistantSuggestions, useAssistantConversation } from './useAssistantConversation';
import { FLOW_GUIDES } from './flowGuides';
import { workspaceRepository } from '../../../data-access';
import { SHOW_CHECKLIST_EVENT, START_COACH_EVENT } from './assistantCommands';

const ALL_ON = { cloudCost: true, sapMonitoring: true };

describe('assistantSuggestions', () => {
  it('shows every module suggestion plus Generate report when all 3 modules are enabled', () => {
    expect(assistantSuggestions(ALL_ON)).toEqual(['What is our cloud spend this month?', 'System health', 'Top savings', 'Unread SAP alerts', 'Generate report']);
  });

  it('drops a suggestion for a module the org is not subscribed to, keeping Generate report', () => {
    expect(assistantSuggestions({ ...ALL_ON, sapMonitoring: false })).toEqual(['What is our cloud spend this month?', 'Top savings', 'Generate report']);
  });

  it('keeps only Generate report when no module is enabled', () => {
    expect(assistantSuggestions({ cloudCost: false, sapMonitoring: false })).toEqual(['Generate report']);
  });
});

describe('assistantIntroLabel', () => {
  it('mentions all 3 topics when every module is enabled', () => {
    expect(assistantIntroLabel(ALL_ON)).toBe('Ask anything about your SAP systems or cloud costs.');
  });

  it('mentions only the enabled topics', () => {
    expect(assistantIntroLabel({ ...ALL_ON, sapMonitoring: false })).toBe('Ask anything about your cloud costs.');
  });

  it('falls back to a generic label when no module is enabled', () => {
    expect(assistantIntroLabel({ cloudCost: false, sapMonitoring: false })).toBe('Ask me anything about your Mavera workspace.');
  });
});

describe('useAssistantConversation flow guides', () => {
  it('has no flow guide on a page without one, and free-form questions get the honest no-model reply', () => {
    const { result } = renderHook(() => useAssistantConversation('/dashboard'));
    expect(result.current.flowGuide).toBeUndefined();

    act(() => result.current.send('What is the weather today?'));
    expect(result.current.messages[1].text).toMatch(/no live model connected yet/);
  });

  it('replies with the authored walkthrough when the page flow guide chip is sent', () => {
    const { result } = renderHook(() => useAssistantConversation('/budgets'));
    expect(result.current.flowGuide?.key).toBe('budgets');

    act(() => result.current.send(result.current.flowGuide!.chipLabel));
    expect(result.current.messages[1].text).toBe(result.current.flowGuide!.reply);
    expect(result.current.messages[1].text).not.toMatch(/no live model connected yet/);
  });

  it('still gives the honest no-model reply for a free-form question on a guided page', () => {
    const { result } = renderHook(() => useAssistantConversation('/budgets'));
    act(() => result.current.send('Tell me a joke about clouds'));
    expect(result.current.messages[1].text).toMatch(/no live model connected yet/);
  });

  it('starts a fresh conversation when navigating to a page with a different flow guide', () => {
    const { result, rerender } = renderHook(({ pathname }) => useAssistantConversation(pathname), {
      initialProps: { pathname: '/budgets' },
    });
    act(() => result.current.send(result.current.flowGuide!.chipLabel));
    expect(result.current.messages).toHaveLength(2);

    rerender({ pathname: '/cloud/overview' });
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.flowGuide?.key).toBe('connect-cloud-account');
  });

  it.each(FLOW_GUIDES)('resolves the $key guide for its own path and gives its authored reply', (guide) => {
    const { result } = renderHook(() => useAssistantConversation(guide.pathPrefix));
    expect(result.current.flowGuide?.key).toBe(guide.key);

    act(() => result.current.send(guide.chipLabel));
    expect(result.current.messages[1].text).toBe(guide.reply);
  });
});

describe('setup chips and requests', () => {
  afterEach(() => workspaceRepository.reset());

  it('offers the setup chips first, only while there is something to set up, and only for subscribed modules', () => {
    const show = { show: true, cloudOpen: true, sapOpen: true };
    expect(assistantSuggestions(ALL_ON, show).slice(0, 4)).toEqual(['Set me up', 'Help me connect Azure', 'Help me connect SAP', 'Show my checklist']);
    expect(assistantSuggestions(ALL_ON, show)).toContain('Generate report');
    expect(assistantSuggestions({ ...ALL_ON, sapMonitoring: false }, show).slice(0, 3)).toEqual(['Set me up', 'Help me connect Azure', 'Show my checklist']);
    expect(assistantSuggestions(ALL_ON, { show: true, cloudOpen: false, sapOpen: true }).slice(0, 3)).toEqual(['Set me up', 'Help me connect SAP', 'Show my checklist']);
    expect(assistantSuggestions(ALL_ON, { show: false, cloudOpen: true, sapOpen: true })).toEqual(assistantSuggestions(ALL_ON));
  });

  it('asks the app to start the live guide when a connect request is sent, and still answers in the chat', () => {
    const started = vi.fn();
    window.addEventListener(START_COACH_EVENT, started);
    const { result } = renderHook(() => useAssistantConversation('/', ALL_ON));
    act(() => result.current.send('Help me connect Azure'));
    window.removeEventListener(START_COACH_EVENT, started);
    expect(started).toHaveBeenCalledTimes(1);
    expect((started.mock.calls[0][0] as CustomEvent<{ flow: string }>).detail).toEqual({ flow: 'connect-azure' });
    expect(result.current.messages[1].text).toMatch(/Starting the live guide: Connect Azure/);
  });

  it('shows the checklist for "Show my checklist" and guides the first open step for "Set me up"', () => {
    workspaceRepository.setProfile('empty');
    const shown = vi.fn();
    const started = vi.fn();
    window.addEventListener(SHOW_CHECKLIST_EVENT, shown);
    window.addEventListener(START_COACH_EVENT, started);
    const { result } = renderHook(() => useAssistantConversation('/', ALL_ON));
    act(() => result.current.send('Show my checklist'));
    expect(shown).toHaveBeenCalledTimes(1);
    expect(started).not.toHaveBeenCalled();
    act(() => result.current.send('Set me up'));
    window.removeEventListener(SHOW_CHECKLIST_EVENT, shown);
    window.removeEventListener(START_COACH_EVENT, started);
    expect(shown).toHaveBeenCalledTimes(2);
    expect((started.mock.calls[0][0] as CustomEvent<{ flow: string }>).detail.flow).toBe('connect-azure');
  });

  it('does not start a guide for a module the organisation lacks, and leaves ordinary questions alone', () => {
    const started = vi.fn();
    window.addEventListener(START_COACH_EVENT, started);
    const { result } = renderHook(() => useAssistantConversation('/', { cloudCost: true, sapMonitoring: false }));
    act(() => result.current.send('Help me connect SAP'));
    act(() => result.current.send('System health'));
    window.removeEventListener(START_COACH_EVENT, started);
    expect(started).not.toHaveBeenCalled();
  });
});
