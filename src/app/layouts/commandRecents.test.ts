import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_RECENTS, readRecents, rememberRecent } from './commandRecents';

beforeEach(() => window.localStorage.clear());

describe('command recents', () => {
  it('starts empty and remembers the newest first', () => {
    expect(readRecents('u1')).toEqual([]);
    rememberRecent('u1', 'action:add-budget');
    rememberRecent('u1', 'page:budgets');
    expect(readRecents('u1')).toEqual(['page:budgets', 'action:add-budget']);
  });

  it('moves a repeat to the front instead of duplicating it', () => {
    rememberRecent('u1', 'a');
    rememberRecent('u1', 'b');
    rememberRecent('u1', 'a');
    expect(readRecents('u1')).toEqual(['a', 'b']);
  });

  it('keeps only the last five', () => {
    ['1', '2', '3', '4', '5', '6', '7'].forEach((id) => rememberRecent('u1', id));
    expect(readRecents('u1')).toEqual(['7', '6', '5', '4', '3']);
    expect(readRecents('u1')).toHaveLength(MAX_RECENTS);
  });

  it('keeps each user separate', () => {
    rememberRecent('u1', 'a');
    rememberRecent('u2', 'b');
    expect(readRecents('u1')).toEqual(['a']);
    expect(readRecents('u2')).toEqual(['b']);
  });

  it('survives corrupt or unavailable storage', () => {
    window.localStorage.setItem('mavera.palette.recents.u1', '{not json');
    expect(readRecents('u1')).toEqual([]);
    window.localStorage.setItem('mavera.palette.recents.u1', '{"a":1}');
    expect(readRecents('u1')).toEqual([]);
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readRecents('u1')).toEqual([]);
    expect(rememberRecent('u1', 'x')).toEqual(['x']);
    getItem.mockRestore();
    setItem.mockRestore();
  });
});
