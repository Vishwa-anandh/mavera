import type { OrganisationProfile, OrganisationProfileInput } from '../contracts/organisationProfile';
import { onWorkspaceProfileChange } from './workspaceProfile';

/**
 * The organisation's own company profile (name, logo, phone, website, address, about). PROTOTYPE: held in memory for the
 * session and cleared whenever a demo account signs in or out, like every other store; swap each body for an
 * `/organisation/profile` call through ./rest when the backend exists.
 *
 * An observable store: the snapshot is replaced, never mutated, on every save, so it can be handed to
 * `useSyncExternalStore` as is. Treat it as read-only.
 */
const BLANK: OrganisationProfile = { name: '', phone: '', website: '', address: '', about: '', logoDataUrl: null, savedAt: null };

let profile: OrganisationProfile = BLANK;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

onWorkspaceProfileChange(() => {
  profile = BLANK;
  emit();
});

export const organisationProfileRepository = {
  get(): OrganisationProfile {
    return profile;
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  /** Saves the profile (trimmed) and stamps the time; this is what makes the setup step "complete". */
  save(input: OrganisationProfileInput): OrganisationProfile {
    profile = {
      name: input.name.trim(),
      phone: input.phone.trim(),
      website: input.website.trim(),
      address: input.address.trim(),
      about: input.about.trim(),
      logoDataUrl: input.logoDataUrl,
      savedAt: new Date().toISOString(),
    };
    emit();
    return profile;
  },
  /** Test helper: back to the blank profile. */
  reset(): void {
    profile = BLANK;
    emit();
  },
};
