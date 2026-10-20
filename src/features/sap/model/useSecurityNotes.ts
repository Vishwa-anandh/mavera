import { useCallback, useState } from 'react';
import { sapAdminRepository, type NoteCheckResult, type NoteUploadResult, type SecurityNote } from '../../../data-access';
import { useAuth } from '../../auth';

const repo = sapAdminRepository.securityNotes;

export type NotesBusy = { kind: 'upload' } | { kind: 'check' } | { kind: 'recheck' | 'remove'; noteNumber: string } | null;

/** The signed-in person's name for history entries; falls back so the log never shows a blank actor. */
export function useActor(): string {
  const { user } = useAuth();
  return user?.name || user?.email || 'You';
}

/**
 * Security notes held in the data-access store, so uploads, checks and deletions survive moving between pages.
 * Each action is a simulated SAP call: `busy` says which one is running.
 */
export function useSecurityNotes() {
  const actor = useActor();
  const [notes, setNotes] = useState<SecurityNote[]>(() => repo.list());
  const [history, setHistory] = useState(() => repo.history());
  const [busy, setBusy] = useState<NotesBusy>(null);

  const sync = useCallback(() => {
    setNotes(repo.list());
    setHistory(repo.history());
  }, []);

  const run = useCallback(async <T,>(state: NonNullable<NotesBusy>, work: () => Promise<T>): Promise<T> => {
    setBusy(state);
    try {
      return await work();
    } finally {
      sync();
      setBusy(null);
    }
  }, [sync]);

  return {
    notes,
    history,
    busy,
    upload: (numbers: string[]): Promise<NoteUploadResult> => run({ kind: 'upload' }, () => repo.upload(numbers, actor)),
    checkStatus: (): Promise<NoteCheckResult> => run({ kind: 'check' }, () => repo.checkStatus(actor)),
    recheck: (noteNumber: string): Promise<SecurityNote | null> => run({ kind: 'recheck', noteNumber }, () => repo.recheck(noteNumber, actor)),
    remove: (noteNumber: string): Promise<boolean> => run({ kind: 'remove', noteNumber }, () => repo.remove(noteNumber, actor)),
  };
}
