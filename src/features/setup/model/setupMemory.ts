import type { SetupStepId } from './setupSteps';

/**
 * What the wizard remembers per person, the only thing it stores itself (completion is derived from the stores):
 * whether the first-sign-in redirect already happened, whether they chose "Skip for now", and which steps they opened.
 * Kept in this browser's localStorage under the user id, so it survives signing out and in.
 */
export interface SetupMemory {
  redirected: boolean;
  skipped: boolean;
  visited: SetupStepId[];
}

const BLANK: SetupMemory = { redirected: false, skipped: false, visited: [] };
const key = (userId: string) => `mv-setup:${userId}`;

export function readSetupMemory(userId: string | undefined): SetupMemory {
  if (!userId) return BLANK;
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return BLANK;
    const parsed = JSON.parse(raw) as Partial<SetupMemory>;
    return {
      redirected: parsed.redirected === true,
      skipped: parsed.skipped === true,
      visited: Array.isArray(parsed.visited) ? (parsed.visited.filter((id) => typeof id === 'string') as SetupStepId[]) : [],
    };
  } catch {
    return BLANK;
  }
}

export function writeSetupMemory(userId: string | undefined, patch: Partial<SetupMemory>): SetupMemory {
  const next = { ...readSetupMemory(userId), ...patch };
  if (!userId) return next;
  try {
    localStorage.setItem(key(userId), JSON.stringify(next));
  } catch {
    // storage unavailable: the wizard still works, it just forgets
  }
  return next;
}

/**
 * Pure: should signing in land on the setup wizard? Once per person, only for an owner or administrator of a
 * brand-new organisation (nothing connected yet) who has not already been sent there or skipped it, and only while
 * something is left to set up.
 */
export function shouldOpenSetupOnSignIn(input: { memory: SetupMemory; brandNew: boolean; canSetup: boolean; somethingLeft: boolean }): boolean {
  const { memory, brandNew, canSetup, somethingLeft } = input;
  return brandNew && canSetup && somethingLeft && !memory.redirected && !memory.skipped;
}
