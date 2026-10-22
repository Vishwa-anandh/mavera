import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { smartAlertsRepository, workspaceRepository } from '../../data-access';
import { notifyAlertsChanged } from '../../shared/lib/alertsChanged';
import { useNotifications } from './notifications';

const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;
const modules = { cloudCost: true, sapMonitoring: true };

describe('useNotifications for a new organisation', () => {
  beforeEach(() => {
    workspaceRepository.setProfile('empty');
    smartAlertsRepository.seedSampleAlerts('azure', 'acc-new');
  });
  afterEach(() => workspaceRepository.setProfile('populated'));

  it('follows the alert stores: resolving an alert elsewhere (the dashboard) drops it from the bell at once', () => {
    const { result } = renderHook(() => useNotifications(modules), { wrapper });
    const before = result.current.items.length;
    expect(before).toBeGreaterThan(0);

    const active = smartAlertsRepository.list().filter((a) => !a.ignored && a.status !== 'resolved');
    // The feed shows the newest five active alerts; resolving the newest one must change what the bell lists.
    const newest = [...active].sort((a, b) => b.detected_at.localeCompare(a.detected_at))[0];
    act(() => {
      smartAlertsRepository.resolve(newest.id);
      notifyAlertsChanged();
    });
    expect(result.current.items.map((item) => item.title).join('|')).not.toContain(newest.message.slice(0, 40));
    expect(result.current.items.length).toBe(Math.min(5, active.length - 1));
  });
});
