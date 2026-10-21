import { useId } from 'react';
import { CheckIcon, RefreshIcon } from '../../../shared/ui/icons';
import { SETTING_LIMITS, WIDENING_CAP_PTS, WIDENING_STEP_PTS, wideningPoints } from '../model/smartAlertsDerivations';
import type { SettingsForm } from '../model/useSettingsForm';

interface DetectionSettingsPanelProps {
  form: SettingsForm;
  /** Ignores per account; each widens that account's spike threshold. */
  accountFeedback: Record<string, number>;
  schedule: string;
}

/** The Settings tab: the cost-anomaly detection parameters with validation, Save and Reset to defaults, then the per-account widening that ignoring alerts causes. */
export function DetectionSettingsPanel({ form, accountFeedback, schedule }: DetectionSettingsPanelProps) {
  const { draft, setDraft, errors, save, reset, saved } = form;
  const idBase = useId();
  const widened = Object.entries(accountFeedback).filter(([, count]) => count > 0);

  return (
    <div className="mv-alert-settings-grid">
      <section className="mv-panel" aria-labelledby={`${idBase}-title`}>
        <div className="mv-panel-header"><h2 className="mv-panel-title" id={`${idBase}-title`}>Cost anomaly detection</h2></div>
        <p className="mv-muted">
          Tune how sensitive detection is for your organisation. Changes apply from the next detection run, {schedule}. Ignoring an alert also widens the threshold for that account.
        </p>
        <form noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
          {SETTING_LIMITS.map((limit) => {
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

      <section className="mv-panel" aria-labelledby={`${idBase}-widening`}>
        <div className="mv-panel-header"><h2 className="mv-panel-title" id={`${idBase}-widening`}>Threshold widening by account</h2></div>
        <p className="mv-muted">
          Each time you ignore an alert, the spike threshold for that account widens by {WIDENING_STEP_PTS} points, up to {WIDENING_CAP_PTS}. Reopening an ignored alert takes its widening back.
        </p>
        {widened.length === 0 ? (
          <p className="mv-empty-inline">No account has been widened. Every account uses the {saved.spikeThresholdPct}% spike threshold.</p>
        ) : (
          <ul className="mv-recipient-list" aria-label="Accounts with a widened threshold">
            {widened.map(([accountId, count]) => (
              <li key={accountId}>
                <span className="mv-code">{accountId}</span>
                <span className="mv-widening">
                  <strong>{saved.spikeThresholdPct + wideningPoints(count)}%</strong>
                  <span className="mv-muted">+{wideningPoints(count)} pts · {count} {count === 1 ? 'ignore' : 'ignores'}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
