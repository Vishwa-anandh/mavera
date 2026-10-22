/** The last few commands and pages a user ran from the palette, kept per user in localStorage. */
export const MAX_RECENTS = 5;

const keyFor = (userId: string | undefined) => `mavera.palette.recents.${userId ?? 'anonymous'}`;

export function readRecents(userId: string | undefined): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(keyFor(userId)) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string').slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

/** Puts `id` first, drops a repeat of it, keeps the newest five. Storage trouble never blocks running a command. */
export function rememberRecent(userId: string | undefined, id: string): string[] {
  const next = [id, ...readRecents(userId).filter((existing) => existing !== id)].slice(0, MAX_RECENTS);
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(next));
  } catch {
    // private mode or blocked storage: recents just aren't remembered
  }
  return next;
}
