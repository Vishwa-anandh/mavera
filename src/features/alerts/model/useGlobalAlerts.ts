import { useMemo } from 'react';
import { activityRepository, type GlobalAlertRow } from '../../../data-access';

/** The active alerts of every module, most recent first (see activityRepository). */
export function useGlobalAlerts(): GlobalAlertRow[] {
  return useMemo(() => activityRepository.listAlerts(), []);
}
