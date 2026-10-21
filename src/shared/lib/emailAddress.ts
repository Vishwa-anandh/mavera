const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** An error message for an address that can't be added to a recipient list, or null when it can. */
export function validateEmailAddress(email: string, existing: readonly string[] = []): string | null {
  const clean = email.trim();
  if (!clean) return 'Enter an email address.';
  if (!EMAIL_PATTERN.test(clean)) return 'Enter a valid email address, like name@company.com.';
  if (existing.some((address) => address.toLowerCase() === clean.toLowerCase())) return 'This address is already a recipient.';
  return null;
}
