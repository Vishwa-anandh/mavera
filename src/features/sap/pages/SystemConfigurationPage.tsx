import { SearchField } from '../../../shared/ui/SearchField';
import { useState } from 'react';
import { sapAdminRepository, type SapDestination, type SapDestinationInput } from '../../../data-access';
import { fireToast } from '../../../shared/lib/toastEvents';
import { useConfirm } from '../../../shared/ui/ConfirmProvider';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { StatusTag } from '../../../shared/ui/StatusTag';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { CloudIcon, HierarchyIcon, PencilIcon, PlusIcon, TrashIcon } from '../../../shared/ui/icons';
import { openConnectDialog, useConnectOnArrival } from '../../workspace';
import { DestinationDialog } from '../components/DestinationDialog';
import { CONNECTION_STRATEGIES, filterDestinations } from '../../sapDestinations';

const repo = sapAdminRepository.destinations;
const TYPE_LABEL = Object.fromEntries(CONNECTION_STRATEGIES.map((s) => [s.key, s.label]));

/**
 * Manage and connect SAP environment endpoints (MIO /settings). Destinations live in the data-access
 * store so adding, editing, removing and connecting survive moving between pages. The form is shared by
 * Add and Edit; Remove asks first.
 */
export function SystemConfigurationPage() {
  const confirm = useConfirm();
  const [destinations, setDestinations] = useState<SapDestination[]>(() => repo.list());
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<SapDestination | null>(null);
  const reload = () => setDestinations(repo.list());
  // Adding a destination is the shared connect dialog: it stays on this page and connects the new system straight away.
  const addDestination = () => openConnectDialog('sap', { stay: true, onConnected: reload });
  // Ctrl+K "Connect SAP system" and old `?open=connect` links open the same dialog over this page.
  useConnectOnArrival('sap');

  const connectedCount = destinations.filter((d) => d.status === 'Connected').length;
  const visible = filterDestinations(destinations, search);

  const toggleConnection = (d: SapDestination) => {
    const connect = d.status !== 'Connected';
    repo.setConnected(d.id, connect);
    reload();
    fireToast({ type: 'success', message: connect ? `${d.name} connected.` : `${d.name} disconnected.` });
  };

  const save = (input: SapDestinationInput) => {
    if (!editing) return;
    repo.update(editing.id, input);
    fireToast({ type: 'success', message: `${input.name} updated.` });
    reload();
    setEditing(null);
  };

  const remove = async (d: SapDestination) => {
    const ok = await confirm({
      title: `Remove ${d.name}?`,
      description: d.status === 'Connected'
        ? 'It is connected right now, so monitoring of its systems stops. You can add it again later.'
        : 'The destination is removed from Mavera. You can add it again later.',
      variant: 'delete',
      okText: 'Remove destination',
    });
    if (!ok) return;
    repo.remove(d.id);
    reload();
    fireToast({ type: 'success', message: `${d.name} removed.` });
  };

  return (
    <div>
      <PageHeader title="System Configuration" subtitle="Manage and connect your SAP environment endpoints.">
        {destinations.length > 0 && <button type="button" className="mv-primary-button" onClick={addDestination}><PlusIcon size={16} style={{ marginRight: '0.375rem' }} />Add Destination</button>}
      </PageHeader>

      <div className="mv-config-bar">
        <p className="mv-config-count" aria-live="polite">
          <StatusTag tone="success">Connected</StatusTag>
          <span className="mv-muted">{destinations.length} destination{destinations.length === 1 ? '' : 's'} · {connectedCount} active</span>
        </p>
        <SearchField label="Search destinations by name or URL" placeholder="Search by name or URL..." value={search} onChange={setSearch} />
      </div>

      {destinations.length === 0 ? (
        <div className="mv-empty-inline"><p><strong>No destinations yet.</strong></p><p>Add a destination to connect an SAP environment; its health, alerts, jobs and transports then appear across SAP Monitoring.</p><button type="button" className="mv-primary-button" onClick={addDestination}>Add Destination</button></div>
      ) : visible.length === 0 ? (
        <div className="mv-empty-inline"><p><strong>No destinations match “{search.trim()}”.</strong></p><button type="button" className="mv-quiet-button" onClick={() => setSearch('')}>Clear search</button></div>
      ) : (
        <div className="mv-card-grid">
          {visible.map((d) => (
            <section className={`mv-panel mv-destination${d.status === 'Connected' ? ' is-connected' : ''}`} key={d.id} aria-label={d.name}>
              <div className="mv-destination-head">
                <div className="mv-destination-name">
                  <CloudIcon size={18} />
                  <h2 className="mv-panel-title">{d.name}</h2>
                  {d.shortLabel && <span className="mv-muted mv-destination-sid">{d.shortLabel}</span>}
                </div>
                <StatusTag tone={d.status === 'Connected' ? 'success' : 'neutral'}>{d.status}</StatusTag>
              </div>
              <p className="mv-muted mv-destination-url" title={d.url}><span className="mv-destination-type">{TYPE_LABEL[d.connectionType]}</span> {d.url}</p>
              <div className="mv-destination-systems">
                <HierarchyIcon size={13} aria-hidden />
                {d.systems.map((sys) => <StatusTag key={sys} tone="neutral">{sys}</StatusTag>)}
              </div>
              <p className="mv-muted mv-destination-hana">{d.hanaConfigured ? 'Hana Configured' : 'Hana Not Configured'}</p>
              <div className="mv-destination-actions">
                <button type="button" className={d.status === 'Connected' ? 'mv-secondary-button' : 'mv-primary-button'} onClick={() => toggleConnection(d)} aria-label={`${d.status === 'Connected' ? 'Disconnect' : 'Connect'} ${d.name}`}>{d.status === 'Connected' ? 'Disconnect' : 'Connect'}</button>
                <Tooltip content="Edit destination">
                  <button type="button" className="mv-icon-button" aria-label={`Edit destination ${d.name}`} onClick={() => setEditing(d)}><PencilIcon size={16} /></button>
                </Tooltip>
                <Tooltip content="Remove destination">
                  <button type="button" className="mv-icon-button" aria-label={`Remove destination ${d.name}`} onClick={() => remove(d)}><TrashIcon size={16} /></button>
                </Tooltip>
              </div>
            </section>
          ))}
        </div>
      )}

      {editing && (
        <DestinationDialog
          key={editing.id}
          destination={editing}
          existing={destinations}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}
