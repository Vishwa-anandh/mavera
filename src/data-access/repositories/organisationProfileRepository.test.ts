import { beforeEach, describe, expect, it, vi } from 'vitest';
import { organisationProfileRepository } from './organisationProfileRepository';
import { setWorkspaceProfile } from './workspaceProfile';

const input = { name: '  Northwind  ', phone: '+1 555 0100', website: 'https://northwind.example', address: '1 Main St', about: 'Cloud team', logoDataUrl: 'data:image/png;base64,AAAA' };

beforeEach(() => organisationProfileRepository.reset());

describe('organisationProfileRepository', () => {
  it('starts blank and unsaved', () => {
    expect(organisationProfileRepository.get()).toMatchObject({ name: '', savedAt: null, logoDataUrl: null });
  });

  it('saves trimmed values, stamps the time and notifies subscribers', () => {
    const listener = vi.fn();
    const stop = organisationProfileRepository.subscribe(listener);
    const saved = organisationProfileRepository.save(input);
    expect(saved.name).toBe('Northwind');
    expect(saved.savedAt).not.toBeNull();
    expect(organisationProfileRepository.get()).toBe(saved);
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
  });

  it('is cleared when a demo account signs in or out', () => {
    organisationProfileRepository.save(input);
    setWorkspaceProfile('empty');
    expect(organisationProfileRepository.get().savedAt).toBeNull();
    setWorkspaceProfile('populated');
  });
});
