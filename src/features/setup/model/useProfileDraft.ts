import { useState } from 'react';
import { organisationProfileRepository, type OrganisationProfile } from '../../../data-access';
import { fireToast } from '../../../shared/lib/toastEvents';
import { logoFileError, profileDraftOf, profileToSave, sameProfile, validateProfile, type ProfileDraft, type ProfileErrors } from './profileForm';

export interface ProfileDraftApi {
  draft: ProfileDraft;
  errors: ProfileErrors;
  logoError: string | null;
  /** Edited since the last save (or never saved). */
  needsSave: boolean;
  setField: <K extends keyof ProfileDraft>(field: K, value: ProfileDraft[K]) => void;
  chooseLogo: (file: File) => void;
  removeLogo: () => void;
  /** Validates and saves; returns false (and shows the errors) when the profile is not valid. */
  save: () => boolean;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * The company-profile form's draft. It lives above the steps, so moving to another step and back keeps what was typed;
 * nothing reaches the organisation until `save` passes validation.
 */
export function useProfileDraft(saved: OrganisationProfile, fallbackName: string): ProfileDraftApi {
  const [draft, setDraft] = useState<ProfileDraft>(() => profileDraftOf(saved, fallbackName));
  const [attempted, setAttempted] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const errors = attempted ? validateProfile(draft) : {};
  const needsSave = saved.savedAt === null || !sameProfile(draft, profileDraftOf(saved, fallbackName));

  return {
    draft,
    errors,
    logoError,
    needsSave,
    setField: (field, value) => setDraft((current) => ({ ...current, [field]: value })),
    chooseLogo: (file) => {
      const problem = logoFileError(file);
      setLogoError(problem);
      if (problem) return;
      readAsDataUrl(file)
        .then((dataUrl) => setDraft((current) => ({ ...current, logoDataUrl: dataUrl })))
        .catch(() => setLogoError('That image could not be read. Try another one.'));
    },
    removeLogo: () => {
      setLogoError(null);
      setDraft((current) => ({ ...current, logoDataUrl: null }));
    },
    save: () => {
      setAttempted(true);
      if (Object.keys(validateProfile(draft)).length > 0) return false;
      const toSave = profileToSave(draft);
      organisationProfileRepository.save(toSave);
      setDraft(toSave);
      fireToast({ type: 'success', message: 'Company profile saved.' });
      return true;
    },
  };
}
