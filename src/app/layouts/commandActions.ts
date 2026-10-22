import type { ComponentType } from 'react';
import type { ModuleId, PermissionAction } from '../../features/access';
import type { PermissionSet } from '../../shared/lib/permissions';
import { openOnArrivalTarget } from '../../shared/lib/useOpenOnArrival';
import {
  CloudIcon, FileTextIcon, MailIcon, ReportIcon, ServerIcon, SettingsIcon, ShieldIcon,
  SparkleIcon, TargetIcon, UploadIcon, UserIcon, UsersIcon,
} from '../../shared/ui/icons';
import type { PageResult, Searchable } from './pageSearch';

type Icon = ComponentType<{ size?: number; className?: string }>;

/** What running a command does. Most commands navigate to a page that opens the matching form on arrival. */
export type CommandRun =
  | { kind: 'navigate'; to: { pathname: string; search: string; hash: string } }
  | { kind: 'assistant' }
  | { kind: 'tour' }
  | { kind: 'theme' };

export interface CommandAction extends Searchable {
  /** Stable id, also what recents remember (`connect-azure`). */
  id: string;
  run: CommandRun;
  icon: Icon;
}

/** Everything a command can be gated on. */
export interface CommandContext {
  /** The pages this user's menus offer (module subscription and role View already applied). */
  pages: PageResult[];
  /** Role-based access: may the signed-in member do `action` on `module`? */
  can: (module: ModuleId | string, action: PermissionAction) => boolean;
  /** The legacy provider/owner permissions the account pages themselves check. */
  permissions: PermissionSet;
  pathname: string;
  /** Whether the page being viewed has a guided tour. */
  pageHasTour: boolean;
  themeMode: 'light' | 'dark';
}

interface CommandDefinition {
  id: string;
  label: string;
  where: string;
  keywords: string;
  icon: Icon;
  run: CommandRun;
  /** A menu page that must be offered (and not locked): this is the module-subscription gate. Several: any one will do. */
  page?: string | string[];
  /** The role permission that must be granted. */
  need?: [ModuleId, PermissionAction];
  /** Any extra rule the destination page applies itself. */
  allow?: (permissions: PermissionSet) => boolean;
}

const go = (pathname: string, token: string, hash = ''): CommandRun => ({ kind: 'navigate', to: openOnArrivalTarget(pathname, token, hash) });
const canManageBudgets = (p: PermissionSet) => p.isPrivileged || p.azure.canWrite || p.aws.canWrite || p.btp.canWrite || p.gcp.canWrite;

/**
 * The command registry. Each command lists what it needs: the menu page that carries its module (so an
 * unsubscribed module never shows its commands) and the role permission for the action. `?open=<token>`
 * is read by the destination page through useOpenOnArrival, so the form is already open on arrival.
 */
const DEFINITIONS: CommandDefinition[] = [
  { id: 'connect-azure', label: 'Connect Azure subscription', where: 'Cloud Cost › Azure', keywords: 'add link microsoft cloud account tenant', icon: CloudIcon, run: go('/azure', 'connect'), page: 'azure', need: ['provider.azure', 'CREATE'], allow: (p) => p.azure.allowConnect },
  { id: 'connect-aws', label: 'Connect AWS account', where: 'Cloud Cost › AWS', keywords: 'add link amazon web services cloud', icon: CloudIcon, run: go('/aws/accounts', 'connect'), page: 'aws', need: ['provider.aws', 'CREATE'], allow: (p) => p.aws.allowConnect },
  { id: 'connect-gcp', label: 'Connect Google Cloud project', where: 'Cloud Cost › Google Cloud', keywords: 'add link gcp cloud account', icon: CloudIcon, run: go('/gcp/accounts', 'connect'), page: 'gcp', need: ['provider.gcp', 'CREATE'], allow: (p) => p.gcp.allowConnect },
  { id: 'connect-btp', label: 'Connect SAP BTP account', where: 'Cloud Cost › SAP BTP', keywords: 'add link business technology platform global account cloud', icon: CloudIcon, run: go('/btp/accounts', 'connect'), page: 'btp', need: ['provider.btp', 'CREATE'], allow: (p) => p.btp.allowConnect },
  { id: 'connect-sap', label: 'Connect SAP system', where: 'SAP Monitoring › System Configuration', keywords: 'add link destination rfc landscape sid', icon: ServerIcon, run: go('/sap/configuration', 'connect'), page: 'sap-config', need: ['sap.configuration', 'CREATE'] },
  { id: 'add-budget', label: 'Add budget', where: 'Cloud Cost › Budgets & Alerts', keywords: 'create new spending limit threshold', icon: TargetIcon, run: go('/budgets', 'new'), page: 'budgets', need: ['budgets', 'CREATE'], allow: canManageBudgets },
  { id: 'add-channel', label: 'Add notification channel', where: 'Cloud Cost › Budgets & Alerts', keywords: 'create new alert integration email teams notify budget', icon: MailIcon, run: go('/budgets', 'add-channel', '#integrations'), page: 'budgets', need: ['budgets', 'CREATE'], allow: canManageBudgets },
  // Invoices is not a menu item for most organisations (it opens from Cost Overview), so Cloud Cost itself is the gate.
  { id: 'upload-invoice', label: 'Upload invoice', where: 'Cloud Cost › Invoices', keywords: 'add import pdf bill', icon: UploadIcon, run: go('/invoices', 'upload'), page: ['invoices', 'cloud-overview'], need: ['invoices', 'VIEW'], allow: (p) => p.azure.canWrite || p.aws.canWrite || p.btp.canWrite || p.gcp.canWrite },
  { id: 'upload-security-notes', label: 'Upload security notes', where: 'SAP Monitoring › Security Notes', keywords: 'add import sap note numbers patches snotes', icon: ShieldIcon, run: go('/sap/security-notes', 'upload'), page: 'sap-security-notes', need: ['sap.securityNotes', 'EDIT'] },
  { id: 'add-user', label: 'Add user', where: 'Administration › User Management', keywords: 'invite create new member person teammate seat', icon: UserIcon, run: go('/users', 'add-user'), page: 'users', need: ['users', 'CREATE'] },
  { id: 'add-role', label: 'Add role', where: 'Administration › User Management', keywords: 'create new permissions access', icon: UsersIcon, run: go('/users', 'add-role', '#roles'), page: 'users', need: ['roles', 'CREATE'] },
  { id: 'export-cost-report', label: 'Export cost report', where: 'Cloud Cost › Cost Analytics', keywords: 'download csv spreadsheet analytics', icon: ReportIcon, run: go('/cloud/analytics', 'export'), page: 'cloud-analytics', need: ['cost.analytics', 'EXPORT'] },
  { id: 'open-assistant', label: 'Open assistant', where: 'Mavera AI', keywords: 'ask chat help copilot question', icon: SparkleIcon, run: { kind: 'assistant' }, need: ['assistant', 'VIEW'] },
  { id: 'page-tour', label: 'Start tour for this page', where: 'Mavera AI', keywords: 'guide walkthrough help tutorial', icon: FileTextIcon, run: { kind: 'tour' }, need: ['assistant', 'VIEW'] },
];

/** The theme command names the theme it switches to, and answers to both words. */
function themeDefinition(mode: 'light' | 'dark'): CommandAction {
  return {
    id: 'switch-theme',
    label: mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
    where: 'Appearance',
    keywords: 'dark light mode appearance colours colors night day toggle',
    icon: SettingsIcon,
    run: { kind: 'theme' },
  };
}

/** The commands this user may run right now, in registry order. */
export function buildCommandIndex(context: CommandContext): CommandAction[] {
  const offered = new Map(context.pages.map((page) => [page.key, page]));
  const actions: CommandAction[] = [];
  for (const definition of DEFINITIONS) {
    if (definition.page) {
      const wanted = Array.isArray(definition.page) ? definition.page : [definition.page];
      if (!wanted.some((key) => { const page = offered.get(key); return page && !page.locked; })) continue;
    }
    if (definition.need && !context.can(definition.need[0], definition.need[1])) continue;
    if (definition.allow && !definition.allow(context.permissions)) continue;
    if (definition.id === 'page-tour' && !context.pageHasTour) continue;
    actions.push({ id: definition.id, label: definition.label, where: definition.where, keywords: definition.keywords, icon: definition.icon, run: definition.run });
  }
  actions.push(themeDefinition(context.themeMode));
  return actions;
}

/** Commands worth offering before anything is typed. */
export const SUGGESTED_ACTION_IDS = ['connect-azure', 'add-budget', 'upload-invoice', 'add-user', 'open-assistant'];

/** The id recents remember a command or page under. */
export const recentIdForAction = (id: string) => `action:${id}`;
export const recentIdForPage = (key: string) => `page:${key}`;
