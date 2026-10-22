import { describe, expect, it } from 'vitest';
import { MODULES, moduleById, type ModuleId } from './modules';
import {
  can,
  cellState,
  cloneMatrix,
  cloneName,
  countGrants,
  defaultMatrix,
  diffMatrices,
  firstGrantedModuleId,
  hasAnyView,
  isColumnFullyGranted,
  isRowFullyGranted,
  matricesEqual,
  normalizeMatrix,
  sanitizeMatrix,
  setColumn,
  setRow,
  summarizeDiff,
  systemRoles,
  toggleCell,
  totalGrantable,
  validateRoleForm,
  type AccessRole,
} from './permissions';
import { legacyRoleToRoleId, resolveEffectiveRoleId, roleIdToLegacyRole } from './roleResolution';

const role = (id: string, permissions = {}): AccessRole => ({ id, name: id, description: '', kind: 'custom', permissions, updatedAt: null, updatedBy: null });
const byId = (id: string) => systemRoles().find((item) => item.id === id) as AccessRole;

describe('module registry', () => {
  it('has unique ids and only known actions per module', () => {
    const ids = MODULES.map((module) => module.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const module of MODULES) expect(module.actions.length).toBeGreaterThan(0);
  });

  it('gives some modules no DELETE and some no VIEW, and marks ownership transfer Owner-only', () => {
    expect(moduleById('cost.overview')?.actions).not.toContain('DELETE');
    expect(moduleById('ownership')?.actions).toEqual(['EDIT']);
    expect(moduleById('ownership')?.ownerOnly).toEqual(['EDIT']);
  });
});

describe('built-in role matrices', () => {
  it('Owner can do everything that exists', () => {
    const owner = byId('owner');
    for (const module of MODULES) for (const action of module.actions) expect(can(owner, module.id, action)).toBe(true);
    expect(countGrants(owner.permissions).grants).toBe(totalGrantable('owner'));
  });

  it('Admin has everything except ownership transfer and subscription editing', () => {
    const admin = byId('admin');
    expect(can(admin, 'users', 'DELETE')).toBe(true);
    expect(can(admin, 'roles', 'EDIT')).toBe(true);
    expect(can(admin, 'subscription', 'VIEW')).toBe(true);
    expect(can(admin, 'subscription', 'EDIT')).toBe(false);
    expect(can(admin, 'ownership', 'EDIT')).toBe(false);
  });

  it('Analyst views and exports cloud and SAP, and manages budgets and alerts', () => {
    const analyst = byId('analyst');
    expect(can(analyst, 'cost.analytics', 'EXPORT')).toBe(true);
    expect(can(analyst, 'sap.hana', 'VIEW')).toBe(true);
    expect(can(analyst, 'budgets', 'CREATE')).toBe(true);
    expect(can(analyst, 'budgets', 'DELETE')).toBe(true);
    expect(can(analyst, 'smartAlerts', 'EDIT')).toBe(true);
    expect(can(analyst, 'sap.alerts', 'EDIT')).toBe(true);
    expect(can(analyst, 'provider.aws', 'CREATE')).toBe(false);
    expect(can(analyst, 'users', 'VIEW')).toBe(false);
    expect(can(analyst, 'audit', 'VIEW')).toBe(false);
  });

  it('Viewer only ever views, and sees no administration pages besides the subscription', () => {
    const viewer = byId('viewer');
    for (const module of MODULES) {
      for (const action of module.actions) {
        if (action !== 'VIEW') expect(can(viewer, module.id, action)).toBe(false);
      }
    }
    expect(can(viewer, 'dashboard', 'VIEW')).toBe(true);
    expect(can(viewer, 'cost.overview', 'EXPORT')).toBe(false);
    expect(can(viewer, 'users', 'VIEW')).toBe(false);
    expect(can(viewer, 'subscription', 'VIEW')).toBe(true);
  });

  it('returns a fresh object on every call so nobody mutates the defaults', () => {
    const first = defaultMatrix('viewer');
    first.dashboard = ['VIEW', 'EDIT'];
    expect(defaultMatrix('viewer').dashboard).toEqual(['VIEW']);
  });
});

describe('can', () => {
  it('refuses unknown roles, unknown modules and actions a module does not have', () => {
    expect(can(undefined, 'dashboard', 'VIEW')).toBe(false);
    expect(can(byId('owner'), 'nope', 'VIEW')).toBe(false);
    expect(can(byId('owner'), 'dashboard', 'DELETE')).toBe(false);
  });

  it('refuses an Owner-only action for a custom role even if the stored matrix contains it', () => {
    expect(can(role('custom', { ownership: ['EDIT'] }), 'ownership', 'EDIT')).toBe(false);
  });
});

describe('cell states', () => {
  it('distinguishes granted, not granted, not applicable and restricted', () => {
    const matrix = { budgets: ['VIEW' as const] };
    const budgets = moduleById('budgets');
    const overview = moduleById('cost.overview');
    const ownership = moduleById('ownership');
    expect(budgets && cellState(budgets, 'VIEW', matrix, 'x')).toBe('granted');
    expect(budgets && cellState(budgets, 'EDIT', matrix, 'x')).toBe('not_granted');
    expect(overview && cellState(overview, 'DELETE', matrix, 'x')).toBe('not_applicable');
    expect(ownership && cellState(ownership, 'EDIT', matrix, 'x')).toBe('restricted');
    expect(ownership && cellState(ownership, 'EDIT', matrix, 'owner')).toBe('not_granted');
  });
});

describe('editing a matrix', () => {
  it('granting an action also grants View, and revoking View clears the module', () => {
    let matrix = toggleCell({}, 'budgets', 'EDIT', 'custom');
    expect(matrix.budgets).toEqual(['VIEW', 'EDIT']);
    matrix = toggleCell(matrix, 'budgets', 'DELETE', 'custom');
    expect(matrix.budgets).toEqual(['VIEW', 'EDIT', 'DELETE']);
    matrix = toggleCell(matrix, 'budgets', 'EDIT', 'custom');
    expect(matrix.budgets).toEqual(['VIEW', 'DELETE']);
    matrix = toggleCell(matrix, 'budgets', 'VIEW', 'custom');
    expect(matrix.budgets).toBeUndefined();
  });

  it('does not touch cells that are not applicable or restricted', () => {
    const empty = {};
    expect(toggleCell(empty, 'cost.overview', 'DELETE', 'custom')).toBe(empty);
    expect(toggleCell(empty, 'ownership', 'EDIT', 'custom')).toBe(empty);
    expect(toggleCell(empty, 'ownership', 'EDIT', 'owner').ownership).toEqual(['EDIT']);
  });

  it('selects and clears a whole row, skipping what the role cannot hold', () => {
    const full = setRow({}, 'users', true, 'custom');
    expect(full.users).toEqual(['VIEW', 'CREATE', 'EDIT', 'DELETE']);
    expect(isRowFullyGranted(full, 'users', 'custom')).toBe(true);
    expect(setRow(full, 'users', false, 'custom').users).toBeUndefined();
    expect(setRow({}, 'ownership', true, 'custom').ownership).toBeUndefined();
  });

  it('selects and clears a whole column only where the action applies', () => {
    const exportEverywhere = setColumn({}, 'EXPORT', true, 'custom');
    expect(isColumnFullyGranted(exportEverywhere, 'EXPORT', 'custom')).toBe(true);
    expect(exportEverywhere['cost.analytics']).toEqual(['VIEW', 'EXPORT']);
    expect(exportEverywhere.dashboard).toBeUndefined();
    expect(setColumn(exportEverywhere, 'EXPORT', false, 'custom')['cost.analytics']).toEqual(['VIEW']);
    const deleteEverywhere = setColumn({}, 'DELETE', true, 'custom');
    expect(deleteEverywhere['cost.overview']).toBeUndefined();
    expect(deleteEverywhere.budgets).toEqual(['VIEW', 'DELETE']);
  });
});

describe('sanitising stored data', () => {
  it('drops unknown modules, inapplicable and restricted actions, and fills in View', () => {
    const clean = sanitizeMatrix({ budgets: ['EDIT'], 'cost.overview': ['DELETE', 'EXPORT'], mystery: ['VIEW'], ownership: ['EDIT'] }, 'custom');
    expect(clean).toEqual({ budgets: ['VIEW', 'EDIT'], 'cost.overview': ['VIEW', 'EXPORT'] });
  });

  it('normalises View in without disturbing modules that have no View', () => {
    expect(normalizeMatrix({ ownership: ['EDIT'] }, 'owner')).toEqual({ ownership: ['EDIT'] });
  });
});

describe('cloning and naming', () => {
  it('names a copy after its source and keeps counting while names are taken', () => {
    expect(cloneName('Analyst', ['Analyst'])).toBe('Copy of Analyst');
    expect(cloneName('Analyst', ['Analyst', 'copy of analyst'])).toBe('Copy of Analyst (2)');
    expect(cloneName('Analyst', ['Copy of Analyst', 'Copy of Analyst (2)'])).toBe('Copy of Analyst (3)');
  });

  it('copies a matrix so the clone can change without changing the source', () => {
    const source = byId('analyst').permissions;
    const copy = cloneMatrix(source, 'role-new');
    expect(matricesEqual(source, copy)).toBe(true);
    const edited = toggleCell(copy, 'budgets', 'DELETE', 'role-new');
    expect(matricesEqual(source, edited)).toBe(false);
    expect(byId('analyst').permissions.budgets).toContain('DELETE');
  });
});

describe('validateRoleForm', () => {
  const existing = [{ id: 'admin', name: 'Admin' }, { id: 'role-a', name: 'Cost Auditor' }];

  it('requires a name, rejects duplicates case-insensitively, and allows keeping your own name', () => {
    expect(validateRoleForm({ name: '  ', description: '' }, existing).name).toMatch(/Enter a name/);
    expect(validateRoleForm({ name: 'cost auditor', description: '' }, existing).name).toMatch(/already exists/);
    expect(validateRoleForm({ name: 'cost auditor', description: '' }, existing, 'role-a').name).toBeUndefined();
    expect(validateRoleForm({ name: 'FinOps', description: '' }, existing)).toEqual({});
  });

  it('limits name and description length', () => {
    expect(validateRoleForm({ name: 'x'.repeat(41), description: '' }, existing).name).toMatch(/40/);
    expect(validateRoleForm({ name: 'FinOps', description: 'y'.repeat(161) }, existing).description).toMatch(/160/);
  });
});

describe('diffing', () => {
  it('lists every granted and revoked cell in registry order', () => {
    const before = { budgets: ['VIEW' as const, 'EDIT' as const], 'cost.overview': ['VIEW' as const] };
    const after = { budgets: ['VIEW' as const], 'cost.overview': ['VIEW' as const, 'EXPORT' as const], audit: ['VIEW' as const] };
    const changes = diffMatrices(before, after);
    expect(changes.map((change) => `${change.change}:${change.moduleId}:${change.action}`)).toEqual([
      'granted:cost.overview:EXPORT',
      'revoked:budgets:EDIT',
      'granted:audit:VIEW',
    ]);
    expect(summarizeDiff(changes)).toBe('2 granted, 1 revoked');
    expect(summarizeDiff([])).toBe('No changes');
  });

  it('treats identical matrices as equal regardless of how they were built', () => {
    expect(matricesEqual({ budgets: ['VIEW'] }, { budgets: ['VIEW'] })).toBe(true);
    expect(diffMatrices({}, {})).toEqual([]);
  });
});

describe('role resolution', () => {
  it('maps the legacy three-way role onto system roles and back', () => {
    expect(legacyRoleToRoleId('owner')).toBe('owner');
    expect(legacyRoleToRoleId('admin')).toBe('admin');
    expect(legacyRoleToRoleId('member')).toBe('analyst');
    expect(roleIdToLegacyRole('role-cost-auditor')).toBe('member');
    expect(roleIdToLegacyRole('owner')).toBe('owner');
  });

  it('lets only a preview-capable session switch roles, and falls back to Viewer for an unknown role', () => {
    const roles = systemRoles();
    expect(resolveEffectiveRoleId({ ownRoleId: 'owner', previewRoleId: 'viewer', canPreview: true, roles })).toBe('viewer');
    expect(resolveEffectiveRoleId({ ownRoleId: 'owner', previewRoleId: 'viewer', canPreview: false, roles })).toBe('owner');
    expect(resolveEffectiveRoleId({ ownRoleId: 'ghost', previewRoleId: null, canPreview: false, roles })).toBe('viewer');
  });

  it('flags a role that can open nothing', () => {
    expect(hasAnyView(role('empty'))).toBe(false);
    expect(hasAnyView(byId('viewer'))).toBe(true);
  });
});

describe('modules type', () => {
  it('keeps ModuleId assignable from registry ids', () => {
    const id: ModuleId = 'audit';
    expect(moduleById(id)?.label).toBe('Audit Trail');
  });
});

describe('firstGrantedModuleId', () => {
  it('opens on the first module the role holds any grant on', () => {
    expect(firstGrantedModuleId({ budgets: ['VIEW'], 'sap.jobs': ['VIEW'] })).toBe('budgets');
    expect(firstGrantedModuleId(byId('viewer').permissions)).toBe('dashboard');
  });

  it('falls back to the first module when the role holds nothing', () => {
    expect(firstGrantedModuleId({})).toBe(MODULES[0].id);
    expect(firstGrantedModuleId({ budgets: [] })).toBe(MODULES[0].id);
  });
});
