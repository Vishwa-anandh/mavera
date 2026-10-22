import { Link } from 'react-router-dom';
import { isEmptyWorkspace, workspaceRepository } from '../../../data-access';
import { useLastViewedAccount, type LastViewedProvider } from '../../../shared/lib/lastViewedAccount';
import { ChevronRightIcon, CloudIcon } from '../../../shared/ui/icons';
import { accountPath, useWorkspaceVersion } from '../../workspace';

const PROVIDER_LABEL: Record<LastViewedProvider, string> = { azure: 'Azure', aws: 'AWS', gcp: 'Google Cloud', btp: 'SAP BTP' };

/**
 * "Pick up where you left off": the provider account page opened last in this session, one click from the
 * dashboard. Shows nothing until an account has been opened, and nothing for an account that has since been removed
 * (a new organisation's accounts are checked against its workspace).
 */
export function LastViewedAccount() {
  const last = useLastViewedAccount();
  useWorkspaceVersion();
  if (!last) return null;
  if (isEmptyWorkspace() && !workspaceRepository.listAccounts(last.provider).some((account) => account.id === last.id)) return null;
  return (
    <Link className="mv-last-viewed" to={accountPath(last.provider, last.id)}>
      <span className="mv-last-viewed-icon" aria-hidden><CloudIcon size={16} /></span>
      <span className="mv-last-viewed-text">
        <span className="mv-muted">Last viewed account</span>
        <strong>{last.name}</strong>
      </span>
      <span className="mv-status mv-status--info">{PROVIDER_LABEL[last.provider]}</span>
      <ChevronRightIcon size={14} className="mv-insight-chevron" aria-hidden />
    </Link>
  );
}
