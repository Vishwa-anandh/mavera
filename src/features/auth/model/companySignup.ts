/** Static choices and helpers for the Register company flow (/company-signup). */

export const SIGNUP_STEPS = [
  { id: 'license', label: 'License' },
  { id: 'company', label: 'Company' },
  { id: 'verify', label: 'Verify' },
  { id: 'password', label: 'Password' },
] as const;

export type SignupStepId = (typeof SIGNUP_STEPS)[number]['id'];

export const COUNTRIES = [
  'Australia', 'Austria', 'Belgium', 'Brazil', 'Canada', 'Denmark', 'Finland', 'France', 'Germany', 'India', 'Ireland', 'Italy',
  'Japan', 'Malaysia', 'Mexico', 'Netherlands', 'New Zealand', 'Norway', 'Philippines', 'Poland', 'Portugal', 'Saudi Arabia',
  'Singapore', 'South Africa', 'South Korea', 'Spain', 'Sweden', 'Switzerland', 'United Arab Emirates', 'United Kingdom',
  'United States', 'Other',
] as const;

export const COMPANY_SIZES = ['1 to 10 people', '11 to 50 people', '51 to 200 people', '201 to 1,000 people', 'More than 1,000 people'] as const;

/** Seconds before a new verification code may be requested. */
export const RESEND_SECONDS = 30;

export const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
export const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;

/** "0:27" style countdown. */
export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

/** The first and last characters of a token, so a long value stays recognisable in a list. */
export function shortenToken(token: string): string {
  return token.length > 20 ? `${token.slice(0, 8)}…${token.slice(-6)}` : token;
}

export function formatPlan(plan: 'basic' | 'premium' | undefined): string {
  if (!plan) return 'Custom';
  return plan === 'premium' ? 'Premium' : 'Basic';
}

export function formatSeats(seats: number): string {
  return seats === 0 ? 'Unlimited users' : `${seats} users`;
}

export function formatDay(isoDay: string | null): string {
  if (!isoDay) return 'No expiry';
  return new Date(isoDay).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}
