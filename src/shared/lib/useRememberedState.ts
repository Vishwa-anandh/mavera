import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';

const PREFIX = 'mv-remembered';

function storageKey(scope: string, key: string) {
  return `${PREFIX}:${scope}:${key}`;
}

function read<T>(scope: string, key: string, initial: T, isValid?: (value: unknown) => boolean): T {
  try {
    const raw = sessionStorage.getItem(storageKey(scope, key));
    if (raw === null) return initial;
    const parsed: unknown = JSON.parse(raw);
    if (isValid ? !isValid(parsed) : typeof parsed !== typeof initial) return initial;
    return parsed as T;
  } catch {
    return initial;
  }
}

/**
 * `useState` that remembers its value for the rest of the browser session under a scope (for
 * example a product module) and key, so a filter survives moving between pages. Pages in the
 * same scope that use the same key share the value; different scopes never see each other's.
 *
 * Values live in sessionStorage, which sign-out clears. A stored value that no longer passes
 * `isValid` (say, an option that was removed) is ignored in favour of `initial`. Storage
 * failures (private mode, blocked storage) silently fall back to plain in-memory state.
 */
export function useRememberedState<T>(
  scope: string,
  key: string,
  initial: T,
  isValid?: (value: unknown) => boolean,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => read(scope, key, initial, isValid));

  const set = useCallback<Dispatch<SetStateAction<T>>>(
    (next) => {
      setValue((current) => {
        const resolved = typeof next === 'function' ? (next as (prev: T) => T)(current) : next;
        try {
          sessionStorage.setItem(storageKey(scope, key), JSON.stringify(resolved));
        } catch {
          // storage unavailable: keep the in-memory value only
        }
        return resolved;
      });
    },
    [scope, key],
  );

  return [value, set];
}

/** Validator for a value that must be one of a fixed list of options. */
export function oneOf<T>(options: readonly T[]) {
  return (value: unknown) => options.includes(value as T);
}
