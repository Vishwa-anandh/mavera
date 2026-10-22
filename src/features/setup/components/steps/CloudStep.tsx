import { useEffect, useRef, useState } from 'react';
import { workspaceRepository } from '../../../../data-access';
import { fireToast } from '../../../../shared/lib/toastEvents';
import { CheckIcon, CloudIcon, SparkleIcon } from '../../../../shared/ui/icons';
import { CONNECT_PROVIDERS, openConnectDialog, useWorkspaceVersion, type ConnectProvider } from '../../../workspace';
import { connectSampleEverything, providersLeftToConnect } from '../../model/sampleSetup';
import type { SetupModules } from '../../model/setupSteps';
import { useContinueHandler, type RegisterContinue } from '../../model/useContinueHandler';
import { FormCard } from '../FormCard';

const CLOUD_PROVIDERS: ConnectProvider[] = ['azure', 'aws', 'gcp', 'btp'];

interface CloudStepProps {
  register: RegisterContinue;
  modules: SetupModules;
  onChanged: () => void;
}

export const SAMPLE_SETUP_DELAY_MS = 700;

/** Step 4: connect the cloud accounts. Each provider card opens the shared connect dialog; one shortcut connects sample data for everything. */
export function CloudStep({ register, modules, onChanged }: CloudStepProps) {
  useWorkspaceVersion();
  useContinueHandler(register, () => true);
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  const left = providersLeftToConnect(modules);
  const connectAll = () => {
    setBusy(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      const accounts = connectSampleEverything(modules);
      setBusy(false);
      onChanged();
      fireToast({ type: 'success', message: `Connected ${accounts.length} sample connection${accounts.length === 1 ? '' : 's'}. Everything shows sample data.` });
    }, SAMPLE_SETUP_DELAY_MS);
  };

  return (
    <div className="mv-setup-stack">
      <FormCard title="Cloud providers" description="Connect at least one account to see spend, forecasts and savings. Pick a provider, then use sample credentials to try it without real keys.">
        <ul className="mv-setup-providers" aria-label="Cloud providers">
          {CLOUD_PROVIDERS.map((provider) => <ProviderCard key={provider} provider={provider} onConnected={onChanged} />)}
        </ul>
      </FormCard>
      {left.length > 0 && (
        <FormCard title="Just exploring?" description="Connect one sample account of every provider (SAP systems included when your plan has SAP Monitoring) in one step. None of it is real data.">
          <div>
            <button type="button" className="mv-secondary-button" disabled={busy} aria-busy={busy} onClick={connectAll}>
              <SparkleIcon size={15} style={{ marginRight: '0.375rem' }} />{busy ? 'Setting up sample data…' : 'Set up everything with sample data'}
            </button>
            {busy && <p className="mv-muted" role="status">Connecting {left.length} sample {left.length === 1 ? 'connection' : 'connections'}…</p>}
          </div>
        </FormCard>
      )}
    </div>
  );
}

function ProviderCard({ provider, onConnected }: { provider: ConnectProvider; onConnected: () => void }) {
  const definition = CONNECT_PROVIDERS[provider];
  const accounts = provider === 'sap' ? [] : workspaceRepository.listAccounts(provider);
  const connected = accounts.length > 0;
  return (
    <li>
      <button type="button" className={`mv-setup-provider${connected ? ' is-connected' : ''}`} data-provider={provider} aria-label={`${definition.label}, ${connected ? `${accounts.length} connected` : 'not connected'}. ${connected ? 'Connect another' : 'Connect'}`} onClick={() => openConnectDialog(provider, { stay: true, onConnected })}>
        <span className="mv-setup-provider-icon" aria-hidden><CloudIcon size={18} /></span>
        <span className="mv-setup-provider-text">
          <strong>{definition.label}</strong>
          <span className="mv-muted">{connected ? accounts.map((a) => a.name).join(', ') : definition.blurb}</span>
        </span>
        <span className={`mv-status mv-status--${connected ? 'success' : 'neutral'}`}>
          {connected && <CheckIcon size={12} style={{ marginRight: '0.25rem' }} />}{connected ? `${accounts.length} connected` : 'Not connected'}
        </span>
      </button>
    </li>
  );
}
