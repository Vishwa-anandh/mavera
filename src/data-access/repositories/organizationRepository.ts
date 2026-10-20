import type { OrganizationRecord } from '../contracts/licenses';
import { MOCK_ORGANIZATIONS } from '../../demo/superAdmin/mockOrgs';

/**
 * The organizations the Super Admin portal manages, and the ones that register themselves with a
 * license (see licenseRepository). PROTOTYPE: seeded from src/demo and held in memory for the
 * session; swap the bodies for `/admin/organizations` calls once that backend exists.
 *
 * Unlike the read-only repositories, `list()` returns the live (immutable) array rather than a copy:
 * React subscribes to it with useSyncExternalStore, which needs a stable snapshot until something
 * changes. Records are never mutated in place, only replaced.
 */
let organizations: OrganizationRecord[] = [...MOCK_ORGANIZATIONS];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export const organizationRepository = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  list(): OrganizationRecord[] {
    return organizations;
  },
  get(id: string): OrganizationRecord | undefined {
    return organizations.find((org) => org.id === id);
  },
  save(org: OrganizationRecord): void {
    organizations = organizations.map((current) => (current.id === org.id ? org : current));
    emit();
  },
  /** Adds an organization; its id is a unique slug of the name. */
  create(fields: Omit<OrganizationRecord, 'id' | 'memberCount'> & { memberCount?: number }): OrganizationRecord {
    const baseSlug = slugify(fields.name) || 'org';
    let id = `org-${baseSlug}`;
    for (let suffix = 2; organizations.some((o) => o.id === id); suffix += 1) id = `org-${baseSlug}-${suffix}`;
    const org: OrganizationRecord = { memberCount: 0, ...fields, id };
    organizations = [...organizations, org];
    emit();
    return org;
  },
  /** Test helper: restores the seeded list. */
  reset(): void {
    organizations = [...MOCK_ORGANIZATIONS];
    emit();
  },
};
