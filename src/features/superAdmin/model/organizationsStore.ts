import { useSyncExternalStore } from 'react';
import { organizationRepository } from '../../../data-access';
import type { Organization } from './superAdminTypes';

/**
 * The super admin's organization list, shared by the dashboard, the list page and each
 * organization's own page so an edit on one shows up on the others. The list itself lives in the
 * data-access organizationRepository (seeded in memory for the prototype), which is also where a
 * company that registers itself with a license token lands, so it shows up here as Active.
 */
export function useOrganizations(): Organization[] {
  return useSyncExternalStore(organizationRepository.subscribe, organizationRepository.list);
}

export function useOrganization(id: string | undefined): Organization | undefined {
  const all = useOrganizations();
  return id ? all.find((org) => org.id === id) : undefined;
}

export function saveOrganization(org: Organization): void {
  organizationRepository.save(org);
}

/** Adds a new organization and returns it; its id is a unique slug of the name. */
export function createOrganization(fields: Omit<Organization, 'id' | 'memberCount'>): Organization {
  return organizationRepository.create(fields);
}

/** Test helper: restores the seeded list between tests. */
export function resetOrganizations(): void {
  organizationRepository.reset();
}
