import { useSyncExternalStore } from 'react';
import { MOCK_ORGANIZATIONS } from '../../../demo/superAdmin/mockOrgs';
import type { Organization } from './superAdminTypes';

/**
 * PROTOTYPE: the super admin's organization list, shared by the dashboard, the list page and
 * each organization's own page so an edit on one shows up on the others. Seeded from demo data
 * and held in memory for the session (no super-admin backend yet); swap the body of
 * `saveOrganization`/`createOrganization` for API calls through src/data-access once one exists.
 */
let organizations: Organization[] = MOCK_ORGANIZATIONS;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useOrganizations(): Organization[] {
  return useSyncExternalStore(subscribe, () => organizations);
}

export function useOrganization(id: string | undefined): Organization | undefined {
  const all = useOrganizations();
  return id ? all.find((org) => org.id === id) : undefined;
}

export function saveOrganization(org: Organization): void {
  organizations = organizations.map((current) => (current.id === org.id ? org : current));
  emit();
}

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Adds a new organization and returns it; its id is a unique slug of the name. */
export function createOrganization(fields: Omit<Organization, 'id' | 'memberCount'>): Organization {
  const baseSlug = slugify(fields.name) || 'org';
  let id = `org-${baseSlug}`;
  for (let suffix = 2; organizations.some((o) => o.id === id); suffix += 1) id = `org-${baseSlug}-${suffix}`;
  const org: Organization = { ...fields, id, memberCount: 0 };
  organizations = [...organizations, org];
  emit();
  return org;
}

/** Test helper: restores the seeded list between tests. */
export function resetOrganizations(): void {
  organizations = MOCK_ORGANIZATIONS;
  emit();
}
