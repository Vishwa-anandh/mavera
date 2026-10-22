import { sapAdminRepository } from '../../../../data-access';
import { CheckIcon, ServerIcon } from '../../../../shared/ui/icons';
import { openConnectDialog } from '../../../workspace';
import { useContinueHandler, type RegisterContinue } from '../../model/useContinueHandler';
import { FormCard } from '../FormCard';

/** Step 6: connect the first SAP system, through the shared connect dialog. */
export function SapStep({ register, onChanged }: { register: RegisterContinue; onChanged: () => void }) {
  useContinueHandler(register, () => true);
  const systems = sapAdminRepository.destinations.list();
  return (
    <div className="mv-setup-stack">
      <FormCard title="SAP systems" description="Connect a system to monitor its health, jobs, dumps and alerts. Use the sample credentials to try it without real access.">
        <div>
          <button type="button" className="mv-secondary-button" onClick={() => openConnectDialog('sap', { stay: true, onConnected: onChanged })}>
            <ServerIcon size={15} style={{ marginRight: '0.375rem' }} />{systems.length === 0 ? 'Connect an SAP system' : 'Connect another SAP system'}
          </button>
        </div>
        {systems.length > 0 && (
          <ul className="mv-setup-list" aria-label="Connected SAP systems">
            {systems.map((system) => (
              <li key={system.id} className="mv-setup-list-row">
                <span className="mv-setup-list-text"><strong>{system.name}</strong><span className="mv-muted">Sample data</span></span>
                <span className="mv-status mv-status--success"><CheckIcon size={12} style={{ marginRight: '0.25rem' }} />Connected</span>
              </li>
            ))}
          </ul>
        )}
      </FormCard>
    </div>
  );
}
