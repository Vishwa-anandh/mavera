import { useId } from 'react';
import { CheckIcon, RefreshIcon } from '../../../shared/ui/icons';
import { ALERT_SETTING_LIMITS } from '../model/sapAlerts';
import type { AlertSettingsForm } from '../model/useAlertSettingsForm';

function AnomalySettings({ form }: { form: AlertSettingsForm['anomaly'] }) {
  const { draft, setDraft, errors, save, reset } = form;
  const idBase = useId();

  return (
    <section className="mv-panel" aria-labelledby={`${idBase}-title`}>
      <div className="mv-panel-header"><h2 className="mv-panel-title" id={`${idBase}-title`}>Anomaly Detection Settings</h2></div>
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
          <button type="submit" className="mv-primary-button"><CheckIcon size={14} style={{ marginRight: '0.375rem' }} />Save settings</button>
          <button type="button" className="mv-secondary-button" onClick={reset}><RefreshIcon size={14} style={{ marginRight: '0.375rem' }} />Reset to defaults</button>
        </div>
      </form>
    </section>
  );
}

function ThresholdSection({ form }: { form: AlertSettingsForm['hana'] }) {
  const { title, source, drafts, change, save } = form;
  const idBase = useId();

  return (
    <section className="mv-panel" aria-labelledby={`${idBase}-title`}>
      <div className="mv-panel-header"><h2 className="mv-panel-title" id={`${idBase}-title`}>{title}</h2></div>
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
        <button type="button" className="mv-secondary-button" onClick={save}>
          <CheckIcon size={14} style={{ marginRight: '0.375rem' }} />Save {source === 'hana' ? 'HANA' : 'SAP'} thresholds
        </button>
      </div>
    </section>
  );
}

/** The Settings tab: the anomaly-detection parameters, then the per-metric thresholds for each source, side by side where there is room. */
export function AlertSettingsPanel({ form }: { form: AlertSettingsForm }) {
  return (
    <div className="mv-alert-settings-grid">
      <AnomalySettings form={form.anomaly} />
      <ThresholdSection form={form.hana} />
      <ThresholdSection form={form.sap} />
    </div>
  );
}
