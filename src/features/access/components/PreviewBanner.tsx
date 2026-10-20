import { EyeIcon } from '../../../shared/ui/icons';
import { useAccess } from '../model/accessContext';

/** Shown across the top of every page while a demo session previews another role. */
export function PreviewBanner() {
  const { previewRoleId, roles, setPreviewRole } = useAccess();
  if (!previewRoleId) return null;
  const role = roles.find((item) => item.id === previewRoleId);
  return (
    <div className="mv-preview-banner" role="status">
      <EyeIcon size={16} aria-hidden />
      <span>
        Previewing Mavera as <strong>{role?.name ?? previewRoleId}</strong>. Navigation and actions follow that role’s permissions. This is a demo-only view.
      </span>
      <button type="button" className="mv-secondary-button" onClick={() => setPreviewRole(null)}>Exit preview</button>
    </div>
  );
}
