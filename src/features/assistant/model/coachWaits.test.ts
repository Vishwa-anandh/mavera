import { afterEach, describe, expect, it } from 'vitest';
import type { WorkspaceProgressSignals } from '../../../data-access';
import { fillFields, isCoachFlow, isCoachStep, isStepDone, isWaitMet, waitsForClick, waitsOf, type CoachContext } from './coachWaits';
import type { TourStep } from './flowGuides';

const ZERO: WorkspaceProgressSignals = { accounts: 0, destinations: 0, budgets: 0, recipients: 0, members: 0 };
const ctx = (over: Partial<CoachContext> = {}): CoachContext => ({ pathname: '/', baseline: ZERO, signals: ZERO, ...over });
const step = (over: Partial<TourStep> = {}): TourStep => ({ target: 'css:#x', title: 't', body: 'b', ...over });

afterEach(() => { document.body.innerHTML = ''; });

describe('isWaitMet', () => {
  it('sees an element appear and disappear', () => {
    expect(isWaitMet({ kind: 'element', selector: '#dlg' }, ctx())).toBe(false);
    expect(isWaitMet({ kind: 'gone', selector: '#dlg' }, ctx())).toBe(true);
    document.body.innerHTML = '<div id="dlg"></div>';
    expect(isWaitMet({ kind: 'element', selector: '#dlg' }, ctx())).toBe(true);
    expect(isWaitMet({ kind: 'gone', selector: '#dlg' }, ctx())).toBe(false);
  });

  it('treats a field as met only when it holds something other than blanks', () => {
    document.body.innerHTML = '<input id="name" />';
    const input = document.getElementById('name') as HTMLInputElement;
    expect(isWaitMet({ kind: 'field', selector: '#name' }, ctx())).toBe(false);
    input.value = '   ';
    expect(isWaitMet({ kind: 'field', selector: '#name' }, ctx())).toBe(false);
    input.value = 'Ada';
    expect(isWaitMet({ kind: 'field', selector: '#name' }, ctx())).toBe(true);
    expect(isWaitMet({ kind: 'field', selector: '#missing' }, ctx())).toBe(false);
  });

  it('compares a watched count with where it started', () => {
    expect(isWaitMet({ kind: 'change', signal: 'accounts' }, ctx())).toBe(false);
    expect(isWaitMet({ kind: 'change', signal: 'accounts' }, ctx({ signals: { ...ZERO, accounts: 1 } }))).toBe(true);
    expect(isWaitMet({ kind: 'change', signal: 'budgets' }, ctx({ signals: { ...ZERO, accounts: 1 } }))).toBe(false);
    // a count that was already different when the flow began is not a change
    expect(isWaitMet({ kind: 'change', signal: 'members' }, ctx({ baseline: { ...ZERO, members: 2 }, signals: { ...ZERO, members: 2 } }))).toBe(false);
  });

  it('follows the page for a route wait, and leaves clicks to the tour (they are events)', () => {
    expect(isWaitMet({ kind: 'route', startsWith: '/budgets' }, ctx({ pathname: '/budgets' }))).toBe(true);
    expect(isWaitMet({ kind: 'route', startsWith: '/budgets' }, ctx({ pathname: '/users' }))).toBe(false);
    expect(isWaitMet({ kind: 'click' }, ctx())).toBe(false);
  });
});

describe('steps', () => {
  it('treats a list of waits as any one of them', () => {
    const s = step({ waitFor: [{ kind: 'click' }, { kind: 'change', signal: 'accounts' }] });
    expect(waitsOf(s)).toHaveLength(2);
    expect(isStepDone(s, ctx())).toBe(false);
    expect(isStepDone(s, ctx({ signals: { ...ZERO, accounts: 1 } }))).toBe(true);
    expect(waitsForClick(s)).toBe(true);
    expect(waitsForClick(step({ waitFor: { kind: 'route', startsWith: '/' } }))).toBe(false);
    expect(waitsOf(step())).toEqual([]);
  });

  it('knows a coach flow from a plain page tour', () => {
    expect(isCoachStep(step())).toBe(false);
    expect(isCoachStep(step({ action: 'Do this' }))).toBe(true);
    expect(isCoachStep(step({ enter: { navigate: '/budgets' } }))).toBe(true);
    expect(isCoachFlow([step(), step()])).toBe(false);
    expect(isCoachFlow([step(), step({ waitFor: { kind: 'click' } })])).toBe(true);
  });
});

describe('fillFields', () => {
  it('fills empty fields so listeners see an input event, one turn apart, and never overwrites what is there', async () => {
    document.body.innerHTML = '<input id="a" /><input id="b" value="keep me" />';
    const seen: string[] = [];
    document.getElementById('a')!.addEventListener('input', (e) => seen.push((e.target as HTMLInputElement).value));
    const filled = await fillFields([{ selector: '#a', value: 'one' }, { selector: '#b', value: 'two' }, { selector: '#nope', value: 'x' }]);
    expect(filled).toBe(1);
    expect(seen).toEqual(['one']);
    expect((document.getElementById('b') as HTMLInputElement).value).toBe('keep me');
  });
});
