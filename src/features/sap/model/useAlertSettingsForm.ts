import { useState } from 'react';
import { sapAdminRepository, type AlertThresholdConfig } from '../../../data-access';
import { fireToast } from '../../../shared/lib/toastEvents';
import { draftFromSettings, parseSettings, settingsEqual, type SettingsDraft, type SettingsErrors } from './sapAlerts';

const repo = sapAdminRepository.alerts;

type ThresholdSource = 'hana' | 'sap';

/** The edit state of the anomaly-detection form. Held by the page so unsaved edits survive a tab switch. */
function useAnomalyForm(onAdjusted: () => void) {
  const [saved, setSaved] = useState(() => repo.getSettings());
  const [draft, setDraft] = useState<SettingsDraft>(() => draftFromSettings(saved));
  const [errors, setErrors] = useState<SettingsErrors>({});

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

  return { draft, setDraft, errors, save, reset };
}

/** The edit state of one source's metric thresholds. Held by the page for the same reason. */
function useThresholdForm(source: ThresholdSource, title: string, onAdjusted: () => void) {
  const [drafts, setDrafts] = useState<AlertThresholdConfig[]>(() => repo.getThresholds()[source]);
  const change = (key: string, patch: Partial<AlertThresholdConfig>) => setDrafts((cur) => cur.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  const save = () => {
    repo.saveThresholds(source, drafts);
    onAdjusted();
    fireToast({ type: 'success', message: `${title} saved.` });
  };
  return { source, title, drafts, change, save };
}

/** Everything the Settings tab edits; created once by the page. */
export function useAlertSettingsForm(onAdjusted: () => void) {
  const anomaly = useAnomalyForm(onAdjusted);
  const hana = useThresholdForm('hana', 'HANA Monitoring thresholds', onAdjusted);
  const sap = useThresholdForm('sap', 'SAP Monitoring thresholds', onAdjusted);
  return { anomaly, hana, sap };
}

export type AlertSettingsForm = ReturnType<typeof useAlertSettingsForm>;
