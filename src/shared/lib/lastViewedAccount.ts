import { useEffect } from 'react';
import { useRememberedState } from './useRememberedState';

export type LastViewedProvider = 'azure' | 'aws' | 'gcp' | 'btp';

/** The provider account page the user opened most recently in this session. */
export interface LastViewedAccount {
  provider: LastViewedProvider;
  id: string;
  name: string;
}

const PROVIDERS: readonly string[] = ['azure', 'aws', 'gcp', 'btp'];

function isLastViewedAccount(value: unknown): value is LastViewedAccount {
  if (typeof value !== 'object' || value === null) return false;
  const { provider, id, name } = value as Record<string, unknown>;
  return typeof provider === 'string' && PROVIDERS.includes(provider) && typeof id === 'string' && id !== '' && typeof name === 'string';
}

const isStoredValue = (value: unknown) => value === null || isLastViewedAccount(value);

/** The account page opened last this session, or null when none has been opened (read on mount). */
export function useLastViewedAccount(): LastViewedAccount | null {
  return useRememberedState<LastViewedAccount | null>('accounts', 'last-viewed', null, isStoredValue)[0];
}

/**
 * Called by a provider's account page once its account has loaded: remembers it as the last viewed account so the
 * dashboard can offer to reopen it in one click. Does nothing while `account` is undefined (unknown or not loaded).
 */
export function useRememberLastViewedAccount(provider: LastViewedProvider, account: { id: string; name: string } | undefined): void {
  const [current, setCurrent] = useRememberedState<LastViewedAccount | null>('accounts', 'last-viewed', null, isStoredValue);
  const id = account?.id;
  const name = account?.name;
  useEffect(() => {
    if (!id || name === undefined) return;
    if (current?.provider === provider && current.id === id && current.name === name) return;
    setCurrent({ provider, id, name });
  }, [provider, id, name, current, setCurrent]);
}
