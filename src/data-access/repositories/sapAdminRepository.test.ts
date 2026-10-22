import { beforeEach, describe, expect, it } from 'vitest';
import { simulateNoteCheck } from '../../demo/sap/mockSecurityNotes';
import { resetSapAdminStore, sapAdminRepository as repo, setSapAdminLatency } from './sapAdminRepository';
import { sapRepository } from './sapRepository';

beforeEach(() => {
  resetSapAdminStore();
  setSapAdminLatency(0);
});

describe('security notes', () => {
  it('adds uploaded numbers as Unknown with the download pending, and counts repeats as updated', async () => {
    const before = repo.securityNotes.list().length;
    const result = await repo.securityNotes.upload(['3800001', '3727078'], 'Ana');
    expect(result).toEqual({ added: ['3800001'], updated: ['3727078'] });
    const added = repo.securityNotes.list().find((n) => n.noteNumber === '3800001');
    expect(added).toMatchObject({ status: 'Unknown', downloadStatus: 'Pending', priority: null });
    expect(repo.securityNotes.list()).toHaveLength(before + 1);
    expect(repo.securityNotes.history()[0]).toMatchObject({ kind: 'upload', actor: 'Ana' });
  });

  it('checks every Unknown note and records the counts', async () => {
    await repo.securityNotes.upload(['3800001', '3800002'], 'Ana');
    const unknownBefore = repo.securityNotes.list().filter((n) => n.status === 'Unknown').length;
    const result = await repo.securityNotes.checkStatus('Ana');
    expect(result.checked).toBe(unknownBefore);
    expect(result.resolved + result.failed).toBe(result.checked);
    const after = repo.securityNotes.list();
    expect(after.filter((n) => n.status === 'Unknown').length).toBe(result.failed);
    expect(after.find((n) => n.noteNumber === '3800001')?.status).toBe(simulateNoteCheck('3800001').status);
    expect(repo.securityNotes.history()[0]).toMatchObject({ kind: 'check' });
  });

  it('deletes a note and logs it; unknown numbers are not deleted', async () => {
    expect(await repo.securityNotes.remove('3727078', 'Ana')).toBe(true);
    expect(repo.securityNotes.list().some((n) => n.noteNumber === '3727078')).toBe(false);
    expect(repo.securityNotes.history()[0]).toMatchObject({ kind: 'delete' });
    expect(await repo.securityNotes.remove('3727078', 'Ana')).toBe(false);
  });

  it('deletes several notes as one history entry and restores them to their old places', async () => {
    const before = repo.securityNotes.list().map((n) => n.noteNumber);
    const historyBefore = repo.securityNotes.history().length;
    const removal = await repo.securityNotes.removeMany([before[1], before[3], 'not-a-note'], 'Ana');
    expect(removal.removed.map((n) => n.noteNumber)).toEqual([before[1], before[3]]);
    expect(repo.securityNotes.list()).toHaveLength(before.length - 2);
    expect(repo.securityNotes.history()[0]).toMatchObject({ kind: 'delete', summary: 'Deleted 2 notes' });
    expect(await repo.securityNotes.restore(removal)).toBe(2);
    expect(repo.securityNotes.list().map((n) => n.noteNumber)).toEqual(before);
    expect(repo.securityNotes.history()).toHaveLength(historyBefore);
    expect(await repo.securityNotes.restore(removal)).toBe(0);
  });

  it('removeMany of nothing known changes nothing', async () => {
    const removal = await repo.securityNotes.removeMany(['0000000'], 'Ana');
    expect(removal).toMatchObject({ removed: [], entryId: null });
    expect(repo.securityNotes.history()[0]?.kind).not.toBe('delete');
  });

  it('simulates the same answer for the same note number', () => {
    expect(simulateNoteCheck('3800001')).toEqual(simulateNoteCheck('3800001'));
  });
});

describe('destinations', () => {
  const input = { name: 'New env', systems: ['NEW'], timezone: 'UTC — UTC+0', connectionType: 'RFC', url: 'https://x.example.com', client: '100', language: 'EN', username: 'svc' } as const;

  it('adds, edits, connects and removes', () => {
    const created = repo.destinations.add({ ...input, systems: [...input.systems] });
    expect(created).toMatchObject({ status: 'Ready To Connect', connectionType: 'RFC', shortLabel: 'NEW' });
    expect(repo.destinations.update(created.id, { ...input, systems: ['NEW', 'QAS'], name: 'Renamed' })?.name).toBe('Renamed');
    expect(repo.destinations.setConnected(created.id, true)?.status).toBe('Connected');
    expect(repo.destinations.remove(created.id)).toBe(true);
    expect(repo.destinations.list().some((d) => d.id === created.id)).toBe(false);
  });

  it('keeps an edit when listing again (state survives between reads)', () => {
    const [first] = repo.destinations.list();
    repo.destinations.update(first.id, { ...input, systems: ['ZZZ'], name: 'Edited' });
    expect(repo.destinations.list().find((d) => d.id === first.id)?.name).toBe('Edited');
  });
});

describe('transport', () => {
  it('logs refreshes, routes and exports and imports released requests', async () => {
    const start = repo.transport.getState();
    const released = start.transports.filter((t) => t.status === 'Released').map((t) => t.trNumber);
    expect(released.length).toBeGreaterThan(0);
    await repo.transport.refresh('Ana');
    repo.transport.setRoute('DEV', 'PRD', 'Ana');
    repo.transport.recordExport(3, 'Ana');
    const imported = await repo.transport.importTransports([...released, 'DEVK900409'], 'Ana');
    expect(imported.transports.filter((t) => released.includes(t.trNumber)).every((t) => t.status === 'Imported')).toBe(true);
    expect(imported.transports.find((t) => t.trNumber === 'DEVK900409')?.status).toBe('Open');
    expect(imported.route).toEqual({ source: 'DEV', target: 'PRD' });
    expect(imported.activity.length).toBe(start.activity.length + 3 + released.length);
    expect(imported.activity[0]).toMatchObject({ type: 'Import', level: 'Success' });
  });
});

describe('alerts', () => {
  it('resolving takes an alert out of what the rest of the app counts as outstanding', () => {
    const outstanding = () => sapRepository.listAlerts().length;
    const before = outstanding();
    repo.alerts.resolve('alert-1');
    expect(outstanding()).toBe(before - 1);
    expect(repo.alerts.list().find((a) => a.id === 'alert-1')).toMatchObject({ state: 'resolved', read: true });
    repo.alerts.reopen('alert-1');
    expect(outstanding()).toBe(before);
  });

  it('saves settings, counts the adjustment and resets to defaults', () => {
    const defaults = repo.alerts.getDefaultSettings();
    repo.alerts.saveSettings({ ...defaults, sensitivity: 2 });
    expect(repo.alerts.getSettings().sensitivity).toBe(2);
    expect(repo.alerts.listAdjustments()).toHaveLength(1);
    expect(repo.alerts.resetSettings()).toEqual(defaults);
    expect(repo.alerts.listAdjustments()).toHaveLength(2);
  });

  it('marks all read, optionally by source', () => {
    const hanaUnread = repo.alerts.list().filter((a) => a.source === 'HANA' && !a.read && a.state === 'active').length;
    expect(repo.alerts.markAllRead('HANA')).toBe(hanaUnread);
    expect(repo.alerts.list().some((a) => a.source === 'SAP' && !a.read)).toBe(true);
  });

  it('keeps a recipient list without duplicates', () => {
    const start = repo.alerts.listRecipients().length;
    repo.alerts.addRecipient('Ops@Maitsys.com');
    repo.alerts.addRecipient('ops@maitsys.com');
    expect(repo.alerts.listRecipients()).toHaveLength(start + 1);
    expect(repo.alerts.removeRecipient('OPS@maitsys.com')).toHaveLength(start);
  });

  it('feeds the note summary other pages read', async () => {
    const total = sapRepository.getSecurityNoteSummary().total;
    await repo.securityNotes.remove('3727078', 'Ana');
    expect(sapRepository.getSecurityNoteSummary().total).toBe(total - 1);
  });
});
