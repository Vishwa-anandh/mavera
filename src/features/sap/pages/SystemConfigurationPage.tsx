import { useState } from 'react';
import { MOCK_SAP_DESTINATIONS, type SapDestination } from '../../../demo/sap/mockSystemConfiguration';
import { CloudIcon, PlusIcon, PencilIcon, TrashIcon, SearchIcon, HierarchyIcon, GridIcon, ServerIcon, CloseIcon } from '../../../shared/ui/icons';
import { Select } from '../../../shared/ui/Select';
import { fireToast } from '../../../shared/lib/toastEvents';
import { PageHeader } from '../../../shared/ui/PageHeader';

const STRATEGIES = [
  { key: 'ODATA' as const, label: 'OData', icon: GridIcon, help: 'SAP NetWeaver Gateway / S/4HANA OData services' },
  { key: 'RFC' as const, label: 'RFC', icon: ServerIcon, help: 'Classic SAP RFC / BAPI connectivity' },
  { key: 'BTP_API' as const, label: 'BTP API', icon: CloudIcon, help: 'SAP BTP Cloud Foundry destination API' },
];
const TIMEZONES = ['UTC — UTC+0', 'IST — UTC+5:30', 'CET — UTC+1', 'EST — UTC-5'];

function NewDestinationModal({ onClose, onCreate }: { onClose: () => void; onCreate: (dest: SapDestination) => void }) {
  const [name, setName] = useState('');
  const [sid, setSid] = useState('');
  const [timezone, setTimezone] = useState(TIMEZONES[0]);
  const [strategy, setStrategy] = useState<(typeof STRATEGIES)[number]['key']>('ODATA');
  const [url, setUrl] = useState('');
  const [client, setClient] = useState('');
  const [language, setLanguage] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = name.trim() && sid.trim() && url.trim();

  const submit = () => {
    onCreate({
      id: `dest-${Date.now()}`,
      name: name.trim(),
      shortLabel: sid.trim(),
      status: 'Ready To Connect',
      connectionType: strategy === 'BTP_API' ? 'BTP_API' : 'ODATA',
      url: url.trim(),
      systems: [sid.trim().toUpperCase()],
      hanaConfigured: false,
    });
    fireToast({ type: 'success', message: `${name.trim()} added — ready to connect.` });
  };

  return (
    <div className="mv-dialog-backdrop" onClick={onClose}>
      <section className="mv-dialog mv-dialog--wide" role="dialog" aria-modal="true" aria-label="New destination" onClick={(e) => e.stopPropagation()}>
        <div className="mv-panel-header">
          <h2 className="mv-panel-title"><ServerIcon size={18} style={{ verticalAlign: -3, marginRight: '0.5rem' }} />New Destination</h2>
          <button className="mv-icon-button" aria-label="Close" onClick={onClose}><CloseIcon size={18} /></button>
        </div>
        <div className="mv-notice">Set up your SAP environment connection. Choose a connection strategy and provide the required credentials.</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <label className="mv-field">Environment Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Production S/4HANA" /></label>
          <label className="mv-field">SID<input value={sid} onChange={(e) => setSid(e.target.value)} placeholder="e.g. PRD" /></label>
        </div>
        <Select label="SAP System Timezone" value={timezone} onChange={setTimezone} options={TIMEZONES.map((t) => ({ value: t, label: t }))} helpText="Daily monitoring snapshot fires at 23:55 in this timezone" />

        <p className="mv-panel-title" style={{ fontSize: '0.875rem', marginTop: '1rem', marginBottom: '0.5rem' }}>Connection Strategy</p>
        <div className="mv-segmented" style={{ marginBottom: '1rem' }}>
          {STRATEGIES.map(({ key, label, icon: Icon }) => (
            <button key={key} className={`mv-segmented-btn${strategy === key ? ' is-active' : ''}`} onClick={() => setStrategy(key)}><Icon size={14} style={{ marginRight: '0.375rem' }} />{label}</button>
          ))}
        </div>
        <p className="mv-muted" style={{ fontSize: '0.75rem', marginTop: '-0.625rem', marginBottom: '0.875rem' }}>{STRATEGIES.find((s) => s.key === strategy)?.help}</p>

        <p className="mv-panel-title" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Connection Details</p>
        <label className="mv-field">Gateway URL<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-sap-host.com/sap/opu/odata/sap/..." /></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <label className="mv-field">Client<input value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. 100" /></label>
          <label className="mv-field">Language<input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="e.g. EN" /></label>
        </div>

        <p className="mv-panel-title" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Authentication</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <label className="mv-field">Username<input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Your SAP user ID" /></label>
          <label className="mv-field">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" /></label>
        </div>
        <p className="mv-muted" style={{ fontSize: '0.6875rem', marginTop: '-0.5rem' }}>Use a service account or technical user. Credentials are stored encrypted.</p>

        <div className="mv-dialog-actions">
          <button className="mv-secondary-button" onClick={onClose}>Cancel</button>
          <button className="mv-primary-button" disabled={!canSubmit} onClick={submit}>Add Destination</button>
        </div>
      </section>
    </div>
  );
}

/** New addition — manage SAP/BTP destination endpoints, matching MIO's
 * System Configuration page. */
export function SystemConfigurationPage() {
  const [destinations, setDestinations] = useState(MOCK_SAP_DESTINATIONS);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const connectedCount = destinations.filter((d) => d.status === 'Connected').length;

  const toggleConnection = (id: string) => setDestinations((cur) => cur.map((d) => (d.id === id ? { ...d, status: d.status === 'Connected' ? 'Ready To Connect' : 'Connected' } : d)));
  const remove = (id: string) => setDestinations((cur) => cur.filter((d) => d.id !== id));
  const filtered = destinations.filter((d) => `${d.name} ${d.url}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title="System Configuration" subtitle="Manage and connect your SAP environment endpoints.">
        <button className="mv-primary-button" onClick={() => setAdding(true)}><PlusIcon size={16} style={{ marginRight: '0.375rem' }} />Add Destination</button>
      </PageHeader>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
        <span className="mv-status mv-status--success">Connected</span>
        <span className="mv-muted">{destinations.length} destinations · {connectedCount} active</span>
        <div style={{ position: 'relative', marginLeft: 'auto', width: '17.5rem' }}>
          <SearchIcon size={15} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--mv-text-muted)' }} />
          <input className="mv-select" style={{ paddingLeft: '2rem', width: '100%' }} placeholder="Search by name or URL..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="mv-card-grid">
        {filtered.map((d) => (
          <section className="mv-panel" key={d.id} style={d.status === 'Connected' ? { borderColor: 'var(--mv-success)' } : undefined}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <CloudIcon size={18} />
                <strong>{d.name}</strong>
                {d.shortLabel && <span className="mv-muted" style={{ fontSize: '0.6875rem' }}>{d.shortLabel}</span>}
              </div>
              <span className={`mv-status ${d.status === 'Connected' ? 'mv-status--success' : 'mv-status--neutral'}`}>{d.status}</span>
            </div>
            <p className="mv-muted" style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🔗 {d.url}</p>
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', margin: '0.5rem 0' }}>
              <HierarchyIcon size={13} style={{ marginTop: '0.1875rem', color: 'var(--mv-text-muted)' }} />
              {d.systems.map((sys) => <span key={sys} className="mv-status mv-status--danger" style={{ fontSize: '0.6875rem' }}>{sys}</span>)}
            </div>
            <p className="mv-muted" style={{ fontSize: '0.75rem', marginBottom: '0.75rem' }}>{d.hanaConfigured ? 'Hana Configured' : 'Hana Not Configured'}</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className={d.status === 'Connected' ? 'mv-secondary-button' : 'mv-primary-button'} style={{ flex: 1 }} onClick={() => toggleConnection(d.id)}>{d.status === 'Connected' ? 'Disconnect' : 'Connect'}</button>
              <button className="mv-icon-button" aria-label={`Edit ${d.name}`}><PencilIcon size={16} /></button>
              <button className="mv-icon-button" aria-label={`Delete ${d.name}`} onClick={() => remove(d.id)}><TrashIcon size={16} /></button>
            </div>
          </section>
        ))}
      </div>

      {adding && (
        <NewDestinationModal
          onClose={() => setAdding(false)}
          onCreate={(dest) => { setDestinations((cur) => [...cur, dest]); setAdding(false); }}
        />
      )}
    </div>
  );
}
