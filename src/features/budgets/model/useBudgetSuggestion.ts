import { useMemo } from 'react';
import { useDashboardData } from '../../dashboard';
import { suggestBudget, type BudgetSuggestion } from './budgetSuggestion';

/** A suggested name and limit for the next budget, from the same spend data the Cost Overview shows. */
export function useBudgetSuggestion(existingNames: string[]): BudgetSuggestion {
  const { summary } = useDashboardData();
  const key = existingNames.join('\u0000');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for the names, so a new array of the same names does not recompute.
  return useMemo(() => suggestBudget(summary.data, existingNames), [summary.data, key]);
}
