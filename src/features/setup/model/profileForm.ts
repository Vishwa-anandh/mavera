import type { OrganisationProfile, OrganisationProfileInput } from '../../../data-access';

export const PROFILE_LIMITS = { name: 80, website: 120, address: 200, about: 500 } as const;
export const LOGO_MAX_BYTES = 512 * 1024;
export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'] as const;

export type ProfileDraft = OrganisationProfileInput;
export type ProfileErrors = Partial<Record<'name' | 'phone' | 'website' | 'address' | 'about', string>>;

/** The form's starting values: the saved profile, with the organisation's name from sign-in until one is saved. */
export function profileDraftOf(saved: OrganisationProfile, fallbackName: string): ProfileDraft {
  return {
    name: saved.name || fallbackName,
    phone: saved.phone,
    website: saved.website,
    address: saved.address,
    about: saved.about,
    logoDataUrl: saved.logoDataUrl,
  };
}

/** "example.com" and "www.example.com/path" become https URLs; a full http(s) URL is kept. Empty stays empty. */
export function normaliseWebsite(value: string): string {
  const text = value.trim();
  if (!text) return '';
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
}

function validWebsite(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && /\.[a-z]{2,}$/i.test(url.hostname);
  } catch {
    return false;
  }
}

export function validateProfile(draft: ProfileDraft): ProfileErrors {
  const errors: ProfileErrors = {};
  const name = draft.name.trim();
  if (!name) errors.name = 'Enter your company name.';
  else if (name.length > PROFILE_LIMITS.name) errors.name = `Use ${PROFILE_LIMITS.name} characters or fewer.`;

  const phone = draft.phone.trim();
  const digits = phone.replace(/\D/g, '').length;
  if (phone && (!/^\+?[\d\s().-]+$/.test(phone) || digits < 7 || digits > 15)) {
    errors.phone = 'Enter a phone number with 7 to 15 digits, for example +1 555 010 0199.';
  }

  const website = draft.website.trim();
  if (website.length > PROFILE_LIMITS.website) errors.website = `Use ${PROFILE_LIMITS.website} characters or fewer.`;
  else if (website && !validWebsite(normaliseWebsite(website))) errors.website = 'Enter a web address such as northwind.com.';

  if (draft.address.trim().length > PROFILE_LIMITS.address) errors.address = `Use ${PROFILE_LIMITS.address} characters or fewer.`;
  if (draft.about.trim().length > PROFILE_LIMITS.about) errors.about = `Use ${PROFILE_LIMITS.about} characters or fewer.`;
  return errors;
}

/** Why a chosen logo file cannot be used, or null. */
export function logoFileError(file: { type: string; size: number }): string | null {
  if (!(LOGO_TYPES as readonly string[]).includes(file.type)) return 'Use a PNG, JPG, SVG or WebP image.';
  if (file.size > LOGO_MAX_BYTES) return `Use an image under ${LOGO_MAX_BYTES / 1024} KB.`;
  return null;
}

/** The draft as it is saved: the website gets its https:// prefix. */
export function profileToSave(draft: ProfileDraft): ProfileDraft {
  return { ...draft, website: normaliseWebsite(draft.website) };
}

export function sameProfile(a: ProfileDraft, b: ProfileDraft): boolean {
  return a.name.trim() === b.name.trim() && a.phone.trim() === b.phone.trim() && normaliseWebsite(a.website) === normaliseWebsite(b.website)
    && a.address.trim() === b.address.trim() && a.about.trim() === b.about.trim() && a.logoDataUrl === b.logoDataUrl;
}

/** Up to two initials of a company name, for the logo placeholder. */
export function initialsOf(name: string): string {
  const words = name.replace(/\(.*?\)/g, '').split(/\s+/).filter(Boolean);
  return (words.slice(0, 2).map((word) => word[0]).join('') || 'M').toUpperCase();
}

/** The company shown at the foot of the rail: logo, name, website and address, from the saved profile. */
export function companyOf(profile: OrganisationProfile, fallbackName: string) {
  return { name: profile.name || fallbackName, website: profile.website, address: profile.address, logoDataUrl: profile.logoDataUrl };
}
