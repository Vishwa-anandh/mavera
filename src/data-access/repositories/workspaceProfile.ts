import type { WorkspaceProfile } from '../contracts/workspace';

/**
 * Which starting point the signed-in demo organisation has. Every in-memory store registers a
 * re-seed callback here; signing in as a demo account (or signing out) sets the profile and
 * re-seeds them all, so one demo login never sees another's changes.
 */
let profile: WorkspaceProfile = 'populated';
const reseeders: Array<(next: WorkspaceProfile) => void> = [];

export const getWorkspaceProfile = (): WorkspaceProfile => profile;

/** True for a brand-new organisation: stores start empty and data derives from what is connected. */
export const isEmptyWorkspace = (): boolean => profile === 'empty';

/** Registered once, at module load, by each store that has a seed. */
export function onWorkspaceProfileChange(reseed: (next: WorkspaceProfile) => void): void {
  reseeders.push(reseed);
}

/** Selects the profile and re-seeds every store from it (even when the profile is unchanged). */
export function setWorkspaceProfile(next: WorkspaceProfile): void {
  profile = next;
  reseeders.forEach((reseed) => reseed(next));
}
