import { useId, useState } from 'react';
import { sapAdminRepository, type AlertThresholdConfig } from '../../../data-access';
import { fireToast } from '../../../shared/lib/toastEvents';
import { DetailDrawer } from '../../../shared/ui/DetailDrawer';
import { CheckIcon, RefreshIcon } from '../../../shared/ui/icons';
import { ALERT_SETTING_LIMITS, draftFromSettings, parseSettings, settingsEqual, type SettingsDraft, type SettingsErrors } from '../model/sapAlerts';

const repo = sapAdminRepository.alerts;

function AnomalySettings({ onAdjusted }: { onAdjusted: () => void }) {
  const [saved, setSaved] = useState(() => repo.getSettings());
  const [draft, setDraft] = useState<SettingsDraft>(() => draftFromSettings(saved));
  const [errors, setErrors] = useState<SettingsErrors>({});
  const idBase = useId();

  const save = () => {
    const parsed = parseSettings(draft);
    setErrors(parsed.errors);
    if (!parsed.settings) return;
    if (settingsEqual(parsed.settings, saved)) {
      fireToast({ type: 'info', message: 'No changes to save.' });
      return;
    }
    const next = repo.saveSettings(parsed.settings);
    setSaved(next);
    setDraft(draftFromSettings(next));
    onAdjusted();
    fireToast({ type: 'success', message: 'Anomaly detection settings saved. They apply from the next nightly run.' });
  };

  const reset = () => {
    const defaults = repo.resetSettings();
    setSaved(defaults);
    setDraft(draftFromSettings(defaults));
    setErrors({});
    onAdjusted();
    fireToast({ type: 'success', message: 'Anomaly detection settings reset to defaults.' });
  };

  return (
    <section aria-labelledby={`${idBase}-title`}>
      <h3 className="mv-detail-heading" id={`${idBase}-title`}>Anomaly Detection Settings</h3>
      <p className="mv-muted">Tune the Holt-Winters statistical model used to detect anomalies. Level/trend/seasonal smoothing is auto-estimated per metric from its own volatility.</p>
      <form noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
        {ALERT_SETTING_LIMITS.map((limit) => {
          const error = errors[limit.key];
          return (
            <label className="mv-field" key={limit.key}>
              {limit.label}
              <input
                type="number"
                inputMode="decimal"
                min={limit.min}
                max={limit.max}
                step={limit.step}
                value={draft[limit.key]}
                aria-invalid={Boolean(error)}
                aria-describedby={`${idBase}-${limit.key}`}
                onChange={(e) => setDraft((cur) => ({ ...cur, [limit.key]: e.target.value }))}
              />
              <span id={`${idBase}-${limit.key}`} className={error ? 'mv-field-error' : 'mv-field-help'} role={error ? 'alert' : undefined}>{error ?? limit.help}</span>
            </label>
          );
        })}
        <div className="mv-settings-actions">
          <button type="submit" className="mv-primary-button"><CheckIcon size={14} style={{ marginRight: '0.375rem' }} />Save Settings</button>
          <button type="button" className="mv-secondary-button" onClick={reset}><RefreshIcon size={14} style={{ marginRight: '0.375rem' }} />Reset to defaults</button>
        </div>
      </form>
    </section>
  );
}

function ThresholdSection({ title, source, onAdjusted }: { title: string; source: 'hana' | 'sap'; onAdjusted: () => void }) {
  const [drafts, setDrafts] = useState<AlertThresholdConfig[]>(() => repo.getThresholds()[source]);
  const idBase = useId();
  const change = (key: string, patch: Partial<AlertThresholdConfig>) => setDrafts((cur) => cur.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  return (
    <section aria-labelledby={`${idBase}-title`}>
      <h3 className="mv-detail-heading" id={`${idBase}-title`}>{title}</h3>
      <p className="mv-muted">An email goes out once a metric crosses its threshold.</p>
      <ul className="mv-threshold-list">
        {drafts.map((config) => (
          <li key={config.key} className="mv-threshold">
            <div className="mv-threshold-head">
              <div>
                <strong>{config.label}</strong>
                <p className="mv-muted">{config.description}</p>
              </div>
              <button type="button" className="mv-toggle" role="switch" aria-checked={config.enabled} aria-label={`Enable ${config.label} alerting`} onClick={() => change(config.key, { enabled: !config.enabled })} />
            </div>
            <label className={`mv-threshold-range${config.enabled ? '' : ' is-off'}`}>
              <span className="mv-muted">Trigger threshold</span>
              <strong>{config.threshold} {config.unit}</strong>
              <input type="range" min={1} max={config.max} value={config.threshold} disabled={!config.enabled} aria-label={`${config.label} trigger threshold`} onChange={(e) => change(config.key, { threshold: Number(e.target.value) })} />
            </label>
          </li>
        ))}
      </ul>
      <div className="mv-settings-actions">
        <button
          type="button"
          className="mv-secondary-button"
          onClick={() => { repo.saveThresholds(source, drafts); onAdjusted(); fireToast({ type: 'success', message: `${title} saved.` }); }}
        >
          <CheckIcon size={14} style={{ marginRight: '0.375rem' }} />Save {source === 'hana' ? 'HANA' : 'SAP'} thresholds
        </button>
      </div>
    </section>
  );
}

/** Alert settings in a drawer: the anomaly-detection parameters first, then the per-metric thresholds for each source. */
export function AlertSettingsDrawer({ onClose, onAdjusted }: { onClose: () => void; onAdjusted: () => void }) {
  return (
    <DetailDrawer title="Alert Settings" subtitle="Configure when you get notified" onClose={onClose}>
      <AnomalySettings onAdjusted={onAdjusted} />
      <ThresholdSection title="HANA Monitoring thresholds" source="hana" onAdjusted={onAdjusted} />
      <ThresholdSection title="SAP Monitoring thresholds" source="sap" onAdjusted={onAdjusted} />
    </DetailDrawer>
  );
}
