import type { AccessSnapshot, CustomRoleRecord, MemberRecord } from '../contracts/access';
import { MOCK_CUSTOM_ROLES } from '../../demo/access/mockAccessData';
import { MOCK_MEMBERS } from '../../demo/users/mockMembersData';

/**
 * Members and custom roles for the organisation.
 * PROTOTYPE: held in memory so edits survive navigation within the session (and are gone on reload);
 * swap each body for the matching REST call through ./rest when the endpoints exist.
 *
 * Unlike the read-only repositories this is a small observable store, because the signed-in
 * member's own role feeds navigation and route protection everywhere. The snapshot is replaced,
 * never mutated, on every write, so it can be handed out without copying; treat it as read-only.
 */
let state: AccessSnapshot = freshState();
const listeners = new Set<() => void>();

function freshState(): AccessSnapshot {
  return { customRoles: structuredClone(MOCK_CUSTOM_ROLES), members: structuredClone(MOCK_MEMBERS) };
}

function commit(next: AccessSnapshot): void {
  state = next;
  listeners.forEach((listener) => listener());
}

export const accessRepository = {
  getSnapshot(): AccessSnapshot {
    return state;
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Adds the signed-in user to the directory the first time they are seen. Returns the stored record. */
  ensureMember(member: MemberRecord): MemberRecord {
    const existing = state.members.find((m) => m.userId === member.userId);
    if (existing) return existing;
    commit({ ...state, members: [structuredClone(member), ...state.members] });
    return member;
  },
  addMember(member: MemberRecord): void {
    commit({ ...state, members: [...state.members, structuredClone(member)] });
  },
  updateMember(userId: string, patch: Partial<MemberRecord>): void {
    commit({ ...state, members: state.members.map((m) => (m.userId === userId ? { ...m, ...patch } : m)) });
  },

  createRole(role: CustomRoleRecord): void {
    commit({ ...state, customRoles: [...state.customRoles, structuredClone(role)] });
  },
  updateRole(id: string, patch: Partial<Omit<CustomRoleRecord, 'id'>>): void {
    commit({ ...state, customRoles: state.customRoles.map((r) => (r.id === id ? { ...r, ...structuredClone(patch) } : r)) });
  },
  deleteRole(id: string): void {
    commit({ ...state, customRoles: state.customRoles.filter((r) => r.id !== id) });
  },

  /** Puts the seeded data back; used by tests and when a session ends. */
  reset(): void {
    commit(freshState());
  },
};
