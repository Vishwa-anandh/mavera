import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { oneOf, useRememberedState } from './useRememberedState';

describe('useRememberedState', () => {
  beforeEach(() => sessionStorage.clear());

  it('starts from the initial value and remembers changes for the next mount', () => {
    const first = renderHook(() => useRememberedState('sap', 'destination', 'GRC'));
    expect(first.result.current[0]).toBe('GRC');
    act(() => first.result.current[1]('MSQ'));
    expect(first.result.current[0]).toBe('MSQ');
    first.unmount();

    const second = renderHook(() => useRememberedState('sap', 'destination', 'GRC'));
    expect(second.result.current[0]).toBe('MSQ');
  });

  it('keeps scopes apart, so one module never sees another module’s filter', () => {
    const sap = renderHook(() => useRememberedState('sap', 'provider', 'all'));
    act(() => sap.result.current[1]('azure'));
    const cloud = renderHook(() => useRememberedState('cloud', 'provider', 'all'));
    expect(cloud.result.current[0]).toBe('all');
  });

  it('ignores a remembered value that is no longer a valid option', () => {
    sessionStorage.setItem('mv-remembered:sap:destination', JSON.stringify('OLD'));
    const { result } = renderHook(() => useRememberedState('sap', 'destination', 'GRC', oneOf(['GRC', 'MSQ'])));
    expect(result.current[0]).toBe('GRC');
  });

  it('ignores corrupt or wrongly-typed stored values', () => {
    sessionStorage.setItem('mv-remembered:idoc:duration', '{not json');
    sessionStorage.setItem('mv-remembered:idoc:start-date', JSON.stringify(42));
    expect(renderHook(() => useRememberedState('idoc', 'duration', 'All days')).result.current[0]).toBe('All days');
    expect(renderHook(() => useRememberedState('idoc', 'start-date', '')).result.current[0]).toBe('');
  });

  it('supports functional updates', () => {
    const { result } = renderHook(() => useRememberedState('dashboard', 'count', 1));
    act(() => result.current[1]((n) => n + 1));
    expect(result.current[0]).toBe(2);
    expect(sessionStorage.getItem('mv-remembered:dashboard:count')).toBe('2');
  });
});
