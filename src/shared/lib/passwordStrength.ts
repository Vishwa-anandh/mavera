/** The five checks behind the strength meter, in the order they are listed. */
export const PASSWORD_CHECKS: ReadonlyArray<{ id: string; label: string; test: (password: string) => boolean }> = [
  { id: 'length', label: 'At least 8 characters', test: (password) => password.length >= 8 },
  { id: 'lower', label: 'A lowercase letter', test: (password) => /[a-z]/.test(password) },
  { id: 'upper', label: 'An uppercase letter', test: (password) => /[A-Z]/.test(password) },
  { id: 'digit', label: 'A number', test: (password) => /\d/.test(password) },
  { id: 'symbol', label: 'A symbol', test: (password) => /[^A-Za-z0-9]/.test(password) },
];

/** 0 to 5: how many of the checks the password passes (the same scoring the Register page uses). */
export function passwordStrength(password: string): number {
  return PASSWORD_CHECKS.filter((check) => check.test(password)).length;
}

const LEVELS = ['Too short', 'Weak', 'Weak', 'Fair', 'Good', 'Strong'] as const;

export function passwordStrengthLabel(score: number): string {
  return LEVELS[Math.max(0, Math.min(5, score))];
}
