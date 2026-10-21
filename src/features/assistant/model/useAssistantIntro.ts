import { useCallback, useEffect, useState } from 'react';

const keyFor = (userId: string) => `mavera.assistant.intro.${userId}`;

function read(userId: string): boolean {
  try { return window.localStorage.getItem(keyFor(userId)) === 'seen'; } catch { return false; }
}
function remember(userId: string): void {
  try { window.localStorage.setItem(keyFor(userId), 'seen'); } catch { /* storage unavailable: the intro may play again next visit */ }
}

/** How long the intro can run before it is cut short (the animation itself is about 3.4 s). */
export const INTRO_MAX_MS = 5000;

/**
 * The assistant's welcome: for a person who has never seen it, the launcher appears in the middle of the screen
 * with a greeting and then glides to its corner. It plays once per person (remembered in the browser), never
 * for someone who prefers reduced motion, and any click on the launcher ends it at once.
 */
export function useAssistantIntro(userId: string | undefined): { playing: boolean; finish: () => void } {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!userId || read(userId)) return;
    remember(userId);
    const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    setPlaying(true);
    const cutoff = window.setTimeout(() => setPlaying(false), INTRO_MAX_MS);
    return () => window.clearTimeout(cutoff);
  }, [userId]);

  const finish = useCallback(() => setPlaying(false), []);
  return { playing, finish };
}
