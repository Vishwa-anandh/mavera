import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { assistantIntroLabel, assistantSuggestions, useAssistantConversation } from './useAssistantConversation';
import { FLOW_GUIDES } from './flowGuides';

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
