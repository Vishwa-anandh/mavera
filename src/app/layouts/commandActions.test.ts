import { describe, expect, it } from 'vitest';
import { buildCommandIndex, recentIdForAction, recentIdForPage, SUGGESTED_ACTION_IDS, type CommandContext } from './commandActions';
import { buildPageIndex, rankItems } from './pageSearch';
import { resolveNav } from '../router/navConfig';
import { can, systemRoles, type ModuleId } from '../../features/access';
import { derivePermissions } from '../../shared/lib/permissions';
import type { User } from '../../shared/types/auth';

const roles = Object.fromEntries(systemRoles().map((role) => [role.id, role]));
const owner: User = { id: '1', email: 'o@b.com', role: 'owner' };

function context(options: {
  role?: string;
  user?: User;
  providers?: Array<'azure' | 'aws' | 'gcp' | 'btp'>;
  modules?: { cloudCost: boolean; sapMonitoring: boolean };
  invoiceOnly?: boolean;
  pathname?: string;
  pageHasTour?: boolean;
  themeMode?: 'light' | 'dark';
} = {}): CommandContext {
  const user = options.user ?? owner;
  const role = roles[options.role ?? 'owner'];
  const permissions = derivePermissions(user, options.providers ?? ['azure', 'aws', 'gcp', 'btp'], options.invoiceOnly ?? false);
  const canView = (module: ModuleId) => can(role, module, 'VIEW');
  const entries = resolveNav(permissions, {
    features: { budgets: true, smartAlerts: true, syncLogs: true, recommendations: true, cloudManagement: true, invoices: true },
    invoiceOnly: options.invoiceOnly ?? false,
    modules: options.modules ?? { cloudCost: true, sapMonitoring: true },
    canView,
  });
  return {
    pages: buildPageIndex(entries, canView),
    can: (module, action) => can(role, module, action),
    permissions,
    pathname: options.pathname ?? '/',
    pageHasTour: options.pageHasTour ?? true,
    themeMode: options.themeMode ?? 'light',
  };
}

const ids = (ctx: CommandContext) => buildCommandIndex(ctx).map((action) => action.id);

describe('command registry', () => {
  it('offers every command to an owner with every module', () => {
    expect(ids(context({ invoiceOnly: true }))).toEqual([
      'connect-azure', 'connect-aws', 'connect-gcp', 'connect-btp', 'connect-sap', 'add-budget', 'add-channel', 'upload-invoice',
      'upload-security-notes', 'add-user', 'add-role', 'export-cost-report', 'open-assistant', 'page-tour', 'switch-theme',
    ]);
  });

  it('never offers sign out', () => {
    expect(buildCommandIndex(context({ invoiceOnly: true })).some((action) => /sign|log ?out/i.test(`${action.label} ${action.keywords}`))).toBe(false);
  });

  it('suggests only commands that exist in the registry', () => {
    const available = ids(context({ invoiceOnly: true }));
    for (const id of SUGGESTED_ACTION_IDS) expect(available).toContain(id);
    expect(recentIdForAction('x')).toBe('action:x');
    expect(recentIdForPage('budgets')).toBe('page:budgets');
  });

  describe('gating by module subscription', () => {
    it('hides every SAP command when SAP Monitoring is not subscribed', () => {
      const result = ids(context({ modules: { cloudCost: true, sapMonitoring: false } }));
      expect(result).not.toContain('connect-sap');
      expect(result).not.toContain('upload-security-notes');
      expect(result).toContain('connect-azure');
    });

    it('hides the cloud commands when Cloud Cost is not subscribed', () => {
      const result = ids(context({ modules: { cloudCost: false, sapMonitoring: true } }));
      for (const id of ['connect-azure', 'connect-aws', 'connect-gcp', 'connect-btp', 'add-budget', 'add-channel', 'upload-invoice', 'export-cost-report']) expect(result).not.toContain(id);
      expect(result).toContain('connect-sap');
      expect(result).toContain('add-user');
    });

    it('only offers connecting the providers the organisation has', () => {
      const result = ids(context({ providers: ['azure'] }));
      expect(result).toContain('connect-azure');
      expect(result).not.toContain('connect-aws');
      expect(result).not.toContain('connect-btp');
    });

    it('offers Upload invoice wherever Cloud Cost is subscribed, even though Invoices is not in most menus', () => {
      expect(ids(context({ invoiceOnly: false }))).toContain('upload-invoice');
      expect(ids(context({ invoiceOnly: true }))).toContain('upload-invoice');
      expect(ids(context({ modules: { cloudCost: false, sapMonitoring: true } }))).not.toContain('upload-invoice');
    });
  });

  describe('gating by role', () => {
    it('lets a viewer see no commands that change anything', () => {
      const result = ids(context({ role: 'viewer', user: { id: '2', email: 'v@b.com', role: 'member' }, invoiceOnly: true }));
      for (const id of ['add-user', 'add-role', 'add-budget', 'add-channel', 'connect-sap', 'upload-security-notes']) expect(result).not.toContain(id);
      expect(result).toContain('switch-theme');
    });

    it('keeps Add user for a role granted Create on users, and drops it without', () => {
      expect(ids(context({ role: 'admin', user: { id: '3', email: 'a@b.com', role: 'admin' } }))).toContain('add-user');
      expect(ids(context({ role: 'analyst', user: { id: '4', email: 'm@b.com', role: 'member' } }))).not.toContain('add-user');
    });
  });

  describe('page tour and theme', () => {
    it('offers the tour only on a page that has one', () => {
      expect(ids(context({ pageHasTour: false }))).not.toContain('page-tour');
      expect(ids(context({ pageHasTour: true }))).toContain('page-tour');
    });

    it('names the theme it switches to', () => {
      const label = (mode: 'light' | 'dark') => buildCommandIndex(context({ themeMode: mode })).find((a) => a.id === 'switch-theme')?.label;
      expect(label('light')).toBe('Switch to dark theme');
      expect(label('dark')).toBe('Switch to light theme');
    });
  });

  describe('where each command goes', () => {
    const target = (id: string) => {
      const run = buildCommandIndex(context({ invoiceOnly: true })).find((a) => a.id === id)?.run;
      return run?.kind === 'navigate' ? run.to : undefined;
    };
    it.each([
      ['add-budget', '/budgets', '?open=new', ''],
      ['add-channel', '/budgets', '?open=add-channel', '#integrations'],
      ['upload-invoice', '/invoices', '?open=upload', ''],
      ['upload-security-notes', '/sap/security-notes', '?open=upload', ''],
      ['add-user', '/users', '?open=add-user', ''],
      ['add-role', '/users', '?open=add-role', '#roles'],
      ['export-cost-report', '/cloud/analytics', '?open=export', ''],
    ])('%s goes to %s%s%s', (id, pathname, search, hash) => {
      expect(target(id)).toEqual({ pathname, search, hash });
    });

    it.each([
      ['connect-azure', 'azure'],
      ['connect-aws', 'aws'],
      ['connect-gcp', 'gcp'],
      ['connect-btp', 'btp'],
      ['connect-sap', 'sap'],
    ])('%s opens the shared connect dialog for %s, in place', (id, provider) => {
      const run = buildCommandIndex(context({ invoiceOnly: true })).find((a) => a.id === id)?.run;
      expect(run).toEqual({ kind: 'connect', provider });
    });
  });
});

describe('ranking commands', () => {
  const commands = buildCommandIndex(context({ invoiceOnly: true }));
  const pages = context({ invoiceOnly: true }).pages;
  const labels = (query: string) => rankItems(commands, query, { matchWhere: false }).map((c) => c.label);

  it('finds Connect Azure for "az", alongside the Azure page', () => {
    expect(labels('az')[0]).toBe('Connect Azure subscription');
    expect(rankItems(pages, 'az').map((p) => p.label)).toContain('Azure Subscriptions');
    expect(rankItems(pages, 'az')[0].label).toBe('Azure Subscriptions');
  });

  it('finds budget commands for "budget" but leaves "budgets" to the page', () => {
    expect(labels('budget')).toEqual(['Add budget', 'Add notification channel']);
    expect(labels('budgets')).toEqual([]);
  });

  it('matches on the verb and on plain words', () => {
    expect(labels('upload')).toEqual(['Upload invoice', 'Upload security notes']);
    expect(labels('dark')).toEqual(['Switch to dark theme']);
    expect(labels('invite')).toEqual(['Add user']);
    expect(labels('csv')).toEqual(['Export cost report']);
  });
});
