import { useAccess } from '../model/accessContext';

/**
 * "Preview as role" rows for the profile menu. Rendered only for the demo session, which is the
 * organisation's Owner; it lets a demo user see the app as Admin, Analyst, Viewer or a custom role.
 */
export function PreviewRoleMenu() {
  const { canPreview, roles, ownRoleId, previewRoleId, setPreviewRole } = useAccess();
  if (!canPreview) return null;
  const active = previewRoleId ?? ownRoleId;
  return (
    <>
      <div className="mv-menu-divider" role="separator" />
      <div className="mv-menu-heading" id="mv-preview-role-heading">Preview as role <span className="mv-menu-item-hint">Demo only</span></div>
      <div role="group" aria-labelledby="mv-preview-role-heading">
        {roles.map((role) => (
          <button
            key={role.id}
            type="button"
            role="menuitemradio"
            aria-checked={active === role.id}
            className="mv-menu-item"
            onClick={() => setPreviewRole(role.id === ownRoleId ? null : role.id)}
          >
            {role.id === ownRoleId ? `${role.name} (you)` : role.name}
            <span className="mv-menu-check" aria-hidden>{active === role.id ? '✓' : ''}</span>
          </button>
        ))}
      </div>
    </>
  );
}
