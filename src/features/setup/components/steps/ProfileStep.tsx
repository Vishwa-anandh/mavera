import { useId, useRef, type FormEvent } from 'react';
import { PROFILE_LIMITS, LOGO_TYPES, initialsOf } from '../../model/profileForm';
import type { ProfileDraftApi } from '../../model/useProfileDraft';
import { useContinueHandler, type RegisterContinue } from '../../model/useContinueHandler';
import { UploadIcon } from '../../../../shared/ui/icons';
import { FormCard, SetupField } from '../FormCard';

interface ProfileStepProps {
  profile: ProfileDraftApi;
  /** Enter inside a field saves and continues, like the Continue button. */
  onSubmit: () => void;
  register: RegisterContinue;
}

/** Step 1: who the organisation is. Name, logo, phone, website, address and a short description. */
export function ProfileStep({ profile, onSubmit, register }: ProfileStepProps) {
  useContinueHandler(register, () => (profile.needsSave ? profile.save() : true));
  const { draft, errors, logoError, setField } = profile;
  const fileRef = useRef<HTMLInputElement>(null);
  const logoHelpId = useId();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form className="mv-setup-stack" onSubmit={submit} noValidate aria-label="Company profile">
      <FormCard title="Company details" description="This is how your organisation appears to your team and on invoices.">
        <div className="mv-setup-logo">
          <div className="mv-setup-logo-preview" aria-hidden>
            {draft.logoDataUrl ? <img src={draft.logoDataUrl} alt="" /> : <span>{initialsOf(draft.name)}</span>}
          </div>
          <div className="mv-setup-logo-text">
            <strong id={logoHelpId}>Company logo</strong>
            <span className="mv-muted">PNG, JPG, SVG or WebP, up to 512 KB. Shown beside your company name.</span>
            <div className="mv-setup-logo-actions">
              <input
                ref={fileRef}
                type="file"
                accept={LOGO_TYPES.join(',')}
                className="mv-sr-only"
                tabIndex={-1}
                aria-label="Upload company logo"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) profile.chooseLogo(file);
                  event.target.value = '';
                }}
              />
              <button type="button" className="mv-secondary-button" aria-describedby={logoHelpId} onClick={() => fileRef.current?.click()}>
                <UploadIcon size={15} style={{ marginRight: '0.375rem' }} />{draft.logoDataUrl ? 'Replace logo' : 'Upload logo'}
              </button>
              {draft.logoDataUrl && <button type="button" className="mv-quiet-button" onClick={profile.removeLogo}>Remove</button>}
            </div>
            {logoError && <span className="mv-field-error" role="alert">{logoError}</span>}
          </div>
        </div>
        <div className="mv-setup-grid">
          <SetupField label="Company name" required autoFocus value={draft.name} max={PROFILE_LIMITS.name} error={errors.name} onChange={(value) => setField('name', value)} placeholder="Northwind Traders" autoComplete="organization" />
          <SetupField label="Phone" optional type="tel" value={draft.phone} error={errors.phone} onChange={(value) => setField('phone', value)} placeholder="+1 555 010 0199" autoComplete="tel" />
          <SetupField label="Website" optional type="url" value={draft.website} max={PROFILE_LIMITS.website} error={errors.website} help="https:// is added for you." onChange={(value) => setField('website', value)} placeholder="northwind.com" autoComplete="url" />
        </div>
      </FormCard>

      <FormCard title="Address and about" description="Where you are based and what your organisation does. Only your team sees this.">
        <SetupField label="Address" optional multiline rows={2} value={draft.address} max={PROFILE_LIMITS.address} error={errors.address} onChange={(value) => setField('address', value)} placeholder="1 Main Street, Springfield" autoComplete="street-address" />
        <SetupField label="About" optional multiline rows={4} value={draft.about} max={PROFILE_LIMITS.about} error={errors.about} onChange={(value) => setField('about', value)} placeholder="A sentence or two on what your organisation does." />
      </FormCard>
      {/* Several fields and no submit button would stop Enter from submitting; this one is out of sight and out of the tab order. */}
      <button type="submit" className="mv-sr-only" tabIndex={-1} aria-hidden>Save</button>
    </form>
  );
}
