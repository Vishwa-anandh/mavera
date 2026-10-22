import { describe, expect, it } from 'vitest';
import { freeBudgetName, roundLimitUp, suggestBudget } from './budgetSuggestion';

describe('roundLimitUp', () => {
  it('rounds up to a figure a person would type, with a step that grows with the size', () => {
    expect(roundLimitUp(19_140)).toBe(19_500);
    expect(roundLimitUp(19_500)).toBe(19_500);
    expect(roundLimitUp(5_281)).toBe(5_300);
    expect(roundLimitUp(412)).toBe(420);
    expect(roundLimitUp(123_001)).toBe(125_000);
  });
});

describe('freeBudgetName', () => {
  it('uses the plain name when it is free and numbers it when it is taken, ignoring case', () => {
    expect(freeBudgetName([])).toBe('Monthly cloud budget');
    expect(freeBudgetName(['Q3 Engineering'])).toBe('Monthly cloud budget');
    expect(freeBudgetName(['monthly cloud budget'])).toBe('Monthly cloud budget 2');
    expect(freeBudgetName(['Monthly cloud budget', 'Monthly Cloud Budget 2'])).toBe('Monthly cloud budget 3');
  });
});

describe('suggestBudget', () => {
  it('sets the limit 10% above the end-of-month forecast and says so', () => {
    const suggestion = suggestBudget({ totals: { forecast: 17_400 }, monthly: [{ key: '2026-08', total: 1 }] }, []);
    expect(suggestion).toEqual({ name: 'Monthly cloud budget', amount: 19_500, basis: 'End-of-month forecast of $17,400 plus 10% headroom' });
  });

  it('falls back to the average of the last three months when there is no forecast', () => {
    const monthly = [{ key: '2026-05', total: 100 }, { key: '2026-06', total: 9_000 }, { key: '2026-07', total: 12_000 }, { key: '2026-08', total: 15_000 }];
    const suggestion = suggestBudget({ monthly }, ['Monthly cloud budget']);
    expect(suggestion.name).toBe('Monthly cloud budget 2');
    expect(suggestion.amount).toBe(13_500);
    expect(suggestion.basis).toBe('Average of the last 3 months ($12,000) plus 10% headroom');
  });

  it('suggests only a name when there is no spend history yet (a new organisation)', () => {
    expect(suggestBudget(null, [])).toEqual({ name: 'Monthly cloud budget', amount: null, basis: null });
    expect(suggestBudget({}, [])).toMatchObject({ amount: null, basis: null });
  });
});
