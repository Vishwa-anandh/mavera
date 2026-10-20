import { Link } from 'react-router-dom';
import { LockIcon } from '../../../shared/ui/icons';
import { useAccess } from '../model/accessContext';
import { moduleById } from '../model/modules';

interface AccessDeniedProps {
  /** The module the page belongs to, so the message can name what's missing. */
  module?: string;
}

/** The friendly state shown instead of a page the current role cannot view. Never a blank page. */
export function AccessDenied({ module }: AccessDeniedProps) {
  const { currentRole, previewRoleId, setPreviewRole } = useAccess();
  const label = module ? moduleById(module)?.label : undefined;
  return (
    <section className="mv-empty mv-access-denied" role="alert" aria-labelledby="access-denied-title">
      <div className="mv-empty-icon" aria-hidden><LockIcon size={28} /></div>
      <h2 id="access-denied-title">You don’t have access to this page</h2>
      <p>
        {currentRole ? <>Your role, <strong>{currentRole.name}</strong>, </> : 'Your role '}
        doesn’t include permission to view {label ? <strong>{label}</strong> : 'this page'}. Ask an owner or an admin of your organisation to change your role if you need it.
      </p>
      <div className="mv-dialog-actions mv-access-denied-actions">
        {previewRoleId && <button type="button" className="mv-secondary-button" onClick={() => setPreviewRole(null)}>Exit preview</button>}
        <Link className="mv-primary-button" to="/">Go to dashboard</Link>
      </div>
    </section>
  );
}
