import { CloseIcon } from '../../../shared/ui/icons';
import { DEMO_ACCOUNTS } from '../model/demoAccounts';

interface DemoModePanelProps {
  /** Signs in as a demo account (an e-mail from the list, or the Super Admin username). */
  onPick: (identity: string, superAdmin: boolean) => void;
  onClose: () => void;
  /** The Super Admin portal has its own demo username. */
  superAdminUsername: string;
  disabled?: boolean;
}

/**
 * "Demo mode" card on the login page: says there is no backend and lists the sample accounts, one click each
 * (organisation roles, single-module organisations and the Super Admin portal).
 */
export function DemoModePanel({ onPick, onClose, superAdminUsername, disabled }: DemoModePanelProps) {
  return (
    <section className="mv-demo-panel" aria-labelledby="demo-mode-title">
      <header className="mv-demo-panel-head">
        <h2 id="demo-mode-title">Demo mode</h2>
        <button type="button" className="mv-icon-button" aria-label="Close demo mode" onClick={onClose}><CloseIcon size={16} /></button>
      </header>
      <p className="mv-demo-panel-copy">
        No backend: all data is sample data held in memory (reload to reset). Sign in with any password, or jump straight in as:
      </p>
      <ul className="mv-demo-panel-list">
        {DEMO_ACCOUNTS.map((account) => (
          <li key={account.email}>
            <button type="button" className="mv-demo-account" disabled={disabled} onClick={() => onPick(account.email, false)}>
              <span className="mv-demo-account-label">{account.label}</span>
              <span className="mv-demo-account-email">{account.email}</span>
            </button>
          </li>
        ))}
        <li>
          <button type="button" className="mv-demo-account" disabled={disabled} onClick={() => onPick(superAdminUsername, true)}>
            <span className="mv-demo-account-label">Super Admin</span>
            <span className="mv-demo-account-email">{superAdminUsername}</span>
          </button>
        </li>
      </ul>
    </section>
  );
}
