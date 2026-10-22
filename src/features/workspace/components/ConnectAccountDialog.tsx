import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { sapAdminRepository, workspaceRepository, type SapConnectionType } from '../../../data-access';
import { fireToast } from '../../../shared/lib/toastEvents';
import { PasswordField } from '../../../shared/ui/PasswordField';
import { SegmentedToggle } from '../../../shared/ui/SegmentedToggle';
import { ChevronDownIcon, ChevronLeftIcon, CloseIcon, CloudIcon, ServerIcon, SparkleIcon } from '../../../shared/ui/icons';
import { useModalOverlay } from '../../../shared/ui/useOverlay';
import { useAuth } from '../../auth';
import { CONNECTION_STRATEGIES } from '../../sapDestinations';
import { connectAccount, type ConnectedAccount } from '../model/connectAccount';
import {
  CONNECT_PROVIDERS, CONNECT_PROVIDER_ORDER, appendOAuthPath, blankValues, sampleCredentials, validateConnection,
  type ConnectField, type ConnectProvider, type ConnectValues,
} from '../model/connectProviders';
import { useConnectGates } from '../model/useConnectGate';
import { useConnectionStatus } from '../model/useConnectionStatus';

/** How long the "Syncing costs…" / "Testing connection…" state shows before the account is added. */
export const CONNECT_DELAY_MS = { cloud: 900, sap: 1100 } as const;

export interface ConnectAccountDialogProps {
  /** The provider to connect. Omit it to open on the provider picker. */
  provider?: ConnectProvider;
  open: boolean;
  onClose: () => void;
  /** Called with the new account once it is connected and the dialog has closed. */
  onConnected?: (account: ConnectedAccount) => void;
  /** Stay on the current page after connecting instead of opening the new account's page. */
  stay?: boolean;
  /** With a provider: offer "Choose another provider" on the credentials step. */
  canSwitch?: boolean;
}

type Busy = null | { kind: 'one'; provider: ConnectProvider; name: string } | { kind: 'all' };

const iconFor = (provider: ConnectProvider) => (provider === 'sap' ? ServerIcon : CloudIcon);

/** The names an account of this provider would clash with, so sample credentials pick a free one. */
function takenNames(provider: ConnectProvider): string[] {
  return provider === 'sap' ? sapAdminRepository.destinations.list().map((d) => d.name) : workspaceRepository.listAccounts(provider).map((a) => a.name);
}

/**
 * One dialog connects anything: Azure, AWS, Google Cloud, SAP BTP or an SAP system. Launched from a provider's page
 * it opens straight on that provider's credentials; launched generically it first asks what to connect. "Use
 * sample credentials" fills a format-valid set, so connecting is two clicks. Connecting shows a short "Syncing
 * costs…" (SAP: "Testing connection…") state, then closes, says so in a toast and opens the new account's page.
 * The same read-only and account-limit rules the old per-provider forms applied are shown inside the dialog.
 */
export function ConnectAccountDialog({ provider, open, onClose, onConnected, stay = false, canSwitch = false }: ConnectAccountDialogProps) {
  if (!open) return null;
  return <DialogBody initialProvider={provider} onClose={onClose} onConnected={onConnected} stay={stay} canSwitch={canSwitch} />;
}

interface BodyProps {
  initialProvider?: ConnectProvider;
  onClose: () => void;
  onConnected?: (account: ConnectedAccount) => void;
  stay: boolean;
  canSwitch: boolean;
}

function DialogBody({ initialProvider, onClose, onConnected, stay, canSwitch }: BodyProps) {
  const titleId = useId();
  const navigate = useNavigate();
  const { modules } = useAuth();
  const status = useConnectionStatus();
  const gates = useConnectGates();
  const [chosen, setChosen] = useState<ConnectProvider | null>(initialProvider ?? null);
  const [busy, setBusy] = useState<Busy>(null);
  const timer = useRef<number | null>(null);
  const panelRef = useModalOverlay<HTMLElement>(() => close());

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  const close = () => {
    if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
    onClose();
  };

  /** Runs `work` after the short connecting state, then closes, toasts and (unless asked to stay) opens the account. */
  const finish = (delay: number, work: () => ConnectedAccount[], message: (accounts: ConnectedAccount[]) => string, landing?: string) => {
    timer.current = window.setTimeout(() => {
      timer.current = null;
      const accounts = work();
      fireToast({ type: 'success', message: message(accounts) });
      onClose();
      if (!stay) navigate(landing ?? accounts[0]?.path ?? '/');
      accounts.forEach((account) => onConnected?.(account));
    }, delay);
  };

  const connectOne = (provider: ConnectProvider, values: ConnectValues) => {
    setBusy({ kind: 'one', provider, name: values.name.trim() });
    finish(
      provider === 'sap' ? CONNECT_DELAY_MS.sap : CONNECT_DELAY_MS.cloud,
      () => [connectAccount(provider, values)],
      ([account]) => (provider === 'sap' ? `${account.name} connected. Its monitoring data is sample data.` : `${account.name} connected. Its costs are sample data.`),
    );
  };

  const connectEverything = (providers: ConnectProvider[]) => {
    setBusy({ kind: 'all' });
    finish(
      CONNECT_DELAY_MS.cloud + 400,
      () => providers.map((p) => connectAccount(p, sampleCredentials(p, takenNames(p)))),
      (accounts) => `Connected ${accounts.length} sample connection${accounts.length === 1 ? '' : 's'}. Everything shows sample data.`,
      '/',
    );
  };

  const offered = CONNECT_PROVIDER_ORDER.filter((id) => (modules ?? { cloudCost: true, sapMonitoring: true })[CONNECT_PROVIDERS[id].module]);
  const definition = chosen ? CONNECT_PROVIDERS[chosen] : null;
  const canGoBack = chosen !== null && (initialProvider === undefined || canSwitch);
  const Glyph = chosen ? iconFor(chosen) : CloudIcon;

  return (
    <div className="mv-dialog-backdrop" onClick={close}>
      <section ref={panelRef} className="mv-dialog mv-dialog--wide mv-connect-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={busy !== null} data-tour="connect-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="mv-panel-header">
          <div>
            <p className="mv-eyebrow">{chosen === 'sap' ? 'SAP connection' : 'Connection'}</p>
            <h2 id={titleId} className="mv-panel-title"><Glyph size={18} style={{ verticalAlign: -3, marginRight: '0.5rem' }} />{definition ? definition.title : 'Connect an account'}</h2>
          </div>
          <button type="button" className="mv-icon-button" aria-label="Close connection dialog" onClick={close}><CloseIcon size={18} /></button>
        </div>

        {definition && chosen ? (
          <CredentialsStep
            key={chosen}
            provider={chosen}
            busy={busy}
            onBack={canGoBack ? () => setChosen(null) : undefined}
            onCancel={close}
            onConnect={connectOne}
            onEverything={status.nothingConnected ? () => connectEverything(offered.filter((id) => gates[id].allowed)) : undefined}
          />
        ) : (
          <PickerStep
            providers={offered}
            busy={busy}
            onChoose={setChosen}
            onEverything={status.nothingConnected ? () => connectEverything(offered.filter((id) => gates[id].allowed)) : undefined}
          />
        )}
      </section>
    </div>
  );
}

// ---- Step 1: what to connect -------------------------------------------------------------------

function PickerStep({ providers, busy, onChoose, onEverything }: { providers: ConnectProvider[]; busy: Busy; onChoose: (provider: ConnectProvider) => void; onEverything?: () => void }) {
  const listRef = useRef<HTMLUListElement>(null);
  // Coming back from the credentials step: the first option takes focus again.
  useEffect(() => { listRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus(); }, []);
  if (providers.length === 0) {
    return <div className="mv-notice" role="status">Your plan does not include a module that can connect accounts. Contact your administrator.</div>;
  }
  return (
    <>
      <p className="mv-muted">Choose what to connect. Each one takes seconds: use the sample credentials, then Connect.</p>
      <ul ref={listRef} className="mv-connect-picker" aria-label="Providers">
        {providers.map((id, index) => <PickerOption key={id} provider={id} first={index === 0} onChoose={onChoose} />)}
      </ul>
      <EverythingAction busy={busy} onEverything={onEverything} />
    </>
  );
}

function PickerOption({ provider, first, onChoose }: { provider: ConnectProvider; first: boolean; onChoose: (provider: ConnectProvider) => void }) {
  const gate = useConnectGates()[provider];
  const definition = CONNECT_PROVIDERS[provider];
  const Glyph = iconFor(provider);
  return (
    <li>
      <button
        type="button"
        className="mv-connect-option"
        data-tour={`connect-provider-${provider}`}
        data-autofocus={first ? '' : undefined}
        disabled={gate.reason === 'plan'}
        onClick={() => onChoose(provider)}
      >
        <span className="mv-connect-option-icon" aria-hidden><Glyph size={18} /></span>
        <span className="mv-connect-option-text">
          <strong>{definition.label}</strong>
          <span className="mv-muted">{gate.allowed ? definition.blurb : (gate.message ?? definition.blurb)}</span>
        </span>
      </button>
    </li>
  );
}

function EverythingAction({ busy, onEverything }: { busy: Busy; onEverything?: () => void }) {
  if (!onEverything) return null;
  return (
    <div className="mv-connect-everything">
      <button type="button" className="mv-quiet-button" data-tour="connect-everything" disabled={busy !== null} onClick={onEverything}>
        <SparkleIcon size={15} style={{ marginRight: '0.375rem' }} />{busy?.kind === 'all' ? 'Setting up sample data…' : 'Set up everything with sample data'}
      </button>
      {busy?.kind === 'all' && <p className="mv-muted" role="status">Connecting one of each so every page has something to show…</p>}
    </div>
  );
}

// ---- Step 2: credentials ------------------------------------------------------------------------

interface CredentialsProps {
  provider: ConnectProvider;
  busy: Busy;
  onBack?: () => void;
  onCancel: () => void;
  onConnect: (provider: ConnectProvider, values: ConnectValues) => void;
  onEverything?: () => void;
}

function CredentialsStep({ provider, busy, onBack, onCancel, onConnect, onEverything }: CredentialsProps) {
  const definition = CONNECT_PROVIDERS[provider];
  const gate = useConnectGates()[provider];
  const idBase = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const [values, setValues] = useState<ConnectValues>(() => blankValues(provider));
  const [attempted, setAttempted] = useState(false);
  const [focusStamp, setFocusStamp] = useState(0);
  const [cisOpen, setCisOpen] = useState(false);

  const existingSap = useMemo(() => (provider === 'sap' ? sapAdminRepository.destinations.list() : []), [provider]);
  const errors = attempted ? validateConnection(provider, values, existingSap) : {};
  const syncing = busy !== null;
  const sapStrategy = CONNECTION_STRATEGIES.find((s) => s.key === values.connectionType);

  // Choosing a provider in the picker brings this step in after the dialog has opened, so it takes focus itself.
  useEffect(() => { formRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus(); }, []);

  // After a failed Connect, move to the first field that needs attention.
  useEffect(() => {
    if (focusStamp === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [focusStamp]);

  const set = (name: string, value: string) => setValues((current) => ({ ...current, [name]: value }));

  const useSample = () => {
    setValues(sampleCredentials(provider, takenNames(provider)));
    setAttempted(false);
    if (provider === 'btp') setCisOpen(true);
    // The form is complete: Enter or Space now connects.
    window.setTimeout(() => submitRef.current?.focus(), 0);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (syncing) return;
    setAttempted(true);
    const found = validateConnection(provider, values, existingSap);
    if (Object.keys(found).length > 0) {
      if (provider === 'btp' && Object.keys(found).some((key) => key.startsWith('cis'))) setCisOpen(true);
      setFocusStamp((n) => n + 1);
      return;
    }
    onConnect(provider, values);
  };

  const visibleFields = definition.fields.filter((field) => !field.group || cisOpen);
  const mainFields = visibleFields.filter((field) => !field.group);
  const cisFields = visibleFields.filter((field) => field.group === 'cis');
  const firstFieldName = mainFields[0]?.name;

  const renderField = (field: ConnectField) => {
    const id = `${idBase}-${field.name}`;
    const error = errors[field.name];
    const describedBy = [error ? `${id}-error` : '', field.help ? `${id}-help` : ''].filter(Boolean).join(' ') || undefined;
    const common = {
      id, value: values[field.name] ?? '', placeholder: field.placeholder, 'aria-invalid': Boolean(error) || undefined, 'aria-describedby': describedBy, autoComplete: 'off', disabled: syncing,
      'data-autofocus': field.name === firstFieldName ? '' : undefined,
    };
    const onBlur = field.name === 'tokenUrl' || field.name === 'cisTokenUrl' ? () => set(field.name, appendOAuthPath(values[field.name] ?? '')) : undefined;
    return (
      <div key={field.name} className={`mv-connect-field${field.wide ? ' is-wide' : ''}`}>
        {field.kind === 'password' ? (
          <PasswordField label={field.label} {...common} onChange={(e) => set(field.name, e.target.value)} autoComplete="new-password" subject={field.label.toLowerCase()} />
        ) : (
          <label className="mv-field">{field.label}
            {field.kind === 'textarea'
              ? <textarea rows={6} spellCheck={false} {...common} onChange={(e) => set(field.name, e.target.value)} />
              : <input {...common} inputMode={field.kind === 'url' ? 'url' : undefined} spellCheck={false} onChange={(e) => set(field.name, e.target.value)} onBlur={onBlur} />}
          </label>
        )}
        {error && <span className="mv-field-error" id={`${id}-error`} role="alert">{error}</span>}
        {!error && field.help && <span className="mv-field-help" id={`${id}-help`}>{field.help}</span>}
      </div>
    );
  };

  const back = onBack && (
    <button type="button" className="mv-quiet-button mv-connect-back" onClick={onBack} disabled={syncing}><ChevronLeftIcon size={14} style={{ marginRight: '0.25rem' }} />Choose another provider</button>
  );

  if (!gate.allowed && !syncing) {
    return (
      <>
        {back}
        <div className="mv-inline-error" role="alert">{gate.message}</div>
        <div className="mv-dialog-actions"><button type="button" className="mv-secondary-button" onClick={onCancel}>Close</button></div>
        <EverythingAction busy={busy} onEverything={onEverything} />
      </>
    );
  }

  const progress = busy?.kind === 'one' ? (provider === 'sap' ? `Testing connection to ${busy.name}…` : `Syncing costs for ${busy.name}…`) : busy?.kind === 'all' ? 'Connecting sample data…' : '';
  const submitLabel = busy?.kind === 'one' ? (provider === 'sap' ? 'Testing connection…' : 'Syncing costs…') : 'Connect';

  return (
    <form ref={formRef} noValidate onSubmit={submit} aria-label={definition.title}>
      {back}
      <div className="mv-connect-sample">
        <div>
          <strong>Just exploring?</strong>
          <span className="mv-muted">Fill in sample credentials. They are not real, and the account shows sample data.</span>
        </div>
        <button type="button" className="mv-secondary-button" data-tour="use-sample-credentials" disabled={syncing} onClick={useSample}>
          <SparkleIcon size={15} style={{ marginRight: '0.375rem' }} />Use sample credentials
        </button>
      </div>
      <p className="mv-muted mv-connect-hint">{definition.hint}</p>

      <div className="mv-form-grid mv-connect-grid">{mainFields.map(renderField)}</div>

      {provider === 'sap' && (
        <div className="mv-connect-strategy">
          <p className="mv-connect-label">Connection strategy</p>
          <SegmentedToggle label="Connection strategy" value={values.connectionType as SapConnectionType} onChange={(v) => set('connectionType', v)} options={CONNECTION_STRATEGIES.map((s) => ({ value: s.key, label: s.label }))} />
          <p className="mv-field-help">{sapStrategy?.help}</p>
        </div>
      )}

      {provider === 'btp' && (
        <>
          <button type="button" className="mv-quiet-button mv-connect-optional" aria-expanded={cisOpen} disabled={syncing} onClick={() => setCisOpen((v) => !v)}>
            <ChevronDownIcon size={14} style={{ marginRight: '0.375rem', transform: cisOpen ? 'rotate(180deg)' : undefined }} />
            Optional: CIS_Central for the account hierarchy and subaccounts
          </button>
          {cisOpen && <div className="mv-form-grid mv-connect-grid">{cisFields.map(renderField)}</div>}
        </>
      )}

      <EverythingAction busy={busy} onEverything={onEverything} />

      <div className="mv-connect-footer">
        <div className="mv-dialog-actions">
          <button type="button" className="mv-secondary-button" onClick={onCancel}>Cancel</button>
          <button ref={submitRef} type="submit" className="mv-primary-button" data-tour="connect-submit" disabled={syncing} aria-busy={syncing}>
            {syncing && <span className="mv-connect-spinner" aria-hidden />}{submitLabel}
          </button>
        </div>
        {progress && <p className="mv-connect-progress" role="status">{progress}</p>}
      </div>
    </form>
  );
}
