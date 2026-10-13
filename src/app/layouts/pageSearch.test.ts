import { describe, it, expect } from 'vitest';
import { buildPageIndex, searchPages } from './pageSearch';
import { resolveNav } from '../router/navConfig';
import { derivePermissions } from '../../shared/lib/permissions';
import type { User } from '../../shared/types/auth';

const admin: User = { id: '1', email: 'a@b.com', role: 'admin' };
const index = buildPageIndex(resolveNav(derivePermissions(admin, ['azure', 'aws', 'btp', 'gcp'], false)));
const labels = (query: string) => searchPages(index, query).map((page) => page.label);

describe('page search', () => {
  it('finds pages by name, ranking name matches first', () => {
    expect(labels('failed')[0]).toBe('Failed IDocs');
    expect(labels('budget')).toContain('Budgets & Alerts');
  });

  it('matches SAP transaction codes and plain-language keywords', () => {
    expect(labels('st22')).toEqual(['Dumps']);
    expect(labels('sm37')).toEqual(['Jobs']);
    expect(labels('invoice')).toEqual(expect.arrayContaining(['Billing']));
  });

  it('requires every word and says where the page lives', () => {
    const [result] = searchPages(index, 'idoc partner');
    expect(result.label).toBe('Partner/Message Monitoring');
    expect(result.where).toBe('IDoc Monitoring › Partners & alerts');
    expect(labels('nothing-matches-this')).toEqual([]);
  });

  it('includes profile pages, and only pages the user can reach', () => {
    expect(labels('subscription')).toContain('Subscription');
    const member: User = { id: '2', email: 'm@b.com', role: 'member' };
    const memberIndex = buildPageIndex(resolveNav(derivePermissions(member, [], false)));
    expect(searchPages(memberIndex, 'user management')).toEqual([]);
  });

  it('returns nothing for an empty query', () => {
    expect(searchPages(index, '   ')).toEqual([]);
  });
});
