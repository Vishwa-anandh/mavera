import { useState } from 'react';
import { smartAlertsRepository } from '../../../data-access';
import { fireToast } from '../../../shared/lib/toastEvents';
import { draftFromSettings, parseSettings, settingsEqual, type SettingsDraft, type SettingsErrors } from './smartAlertsDerivations';

const repo = smartAlertsRepository;

/** The edit state of the detection-settings form. Held by the page so unsaved edits survive a tab switch. */
export function useSettingsForm(onAdjusted: () => void) {
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
    fireToast({ type: 'success', message: 'Detection settings saved. They apply from the next daily run.' });
  };

  const reset = () => {
    const defaults = repo.resetSettings();
    setSaved(defaults);
    setDraft(draftFromSettings(defaults));
    setErrors({});
    onAdjusted();
    fireToast({ type: 'success', message: 'Detection settings reset to defaults.' });
  };

  return { draft, setDraft, errors, save, reset, saved };
}

export type SettingsForm = ReturnType<typeof useSettingsForm>;
