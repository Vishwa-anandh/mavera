/**
 * The company details an organisation owner fills in during setup (and can change later). The logo is held as a
 * data URL so it can be shown without a file service in this prototype.
 */
export interface OrganisationProfile {
  name: string;
  phone: string;
  website: string;
  address: string;
  about: string;
  /** A small image as a data URL; null when none was uploaded. */
  logoDataUrl: string | null;
  /** ISO timestamp of the last save; null until the owner has saved the profile once. */
  savedAt: string | null;
}

export type OrganisationProfileInput = Omit<OrganisationProfile, 'savedAt'>;
