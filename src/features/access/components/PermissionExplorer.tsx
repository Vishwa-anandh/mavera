import { useRef, useState } from 'react';
import {
  ACTIONS,
  ACTION_LABELS,
  MODULES,
  MODULE_GROUPS,
  modulesInGroup,
  type ModuleGroupId,
  type ModuleId,
  type PermissionAction,
} from '../model/modules';
import {
  cellState,
  isGrantable,
  isRowFullyGranted,
  setRow,
  toggleCell,
  type PermissionMatrix as Matrix,
} from '../model/permissions';

interface PermissionExplorerProps {
  /** The role being shown; decides which cells are restricted (e.g. Owner-only actions). */
  roleId: string;
  roleName: string;
  value: Matrix;
  onChange?: (next: Matrix) => void;
  /** Shows the grants without letting them change (system roles, or no permission to edit roles). */
  readOnly?: boolean;
}

const ACTION_HINTS: Record<PermissionAction, string> = {
  VIEW: 'See the page and its data',
  CREATE: 'Add new items',
  EDIT: 'Change existing items',
  DELETE: 'Remove items',
  EXPORT: 'Download data and reports',
};

/** What the kinds of switch look like, so nobody has to guess what a dashed pill means. */
export function PermissionLegend() {
  return (
    <ul className="mv-matrix-legend" aria-label="Legend">
      <li><span className="mv-toggle mv-matrix-sample" data-on="true" aria-hidden /> Granted</li>
      <li><span className="mv-toggle mv-matrix-sample" aria-hidden /> Not granted</li>
      <li><span className="mv-matrix-na" aria-hidden /> Not applicable</li>
      <li><span className="mv-matrix-na mv-matrix-na--restricted" aria-hidden /> Owner only</li>
    </ul>
  );
}

/**
 * Permissions as three columns: product areas, then the modules in the chosen area, then the chosen module's
 * actions, each with a switch. A switch is replaced by a dashed pill when the action does not exist for that
 * module or only the Owner may hold it. Areas and modules show how many grants the role holds. On narrow screens
 * the columns stack and choosing a module brings its switches into view.
 */
export function PermissionExplorer({ roleId, roleName, value, onChange, readOnly = false }: PermissionExplorerProps) {
  const editable = !readOnly && Boolean(onChange);
  const [selectedId, setSelectedId] = useState<ModuleId>(MODULES[0].id as ModuleId);
  const detailRef = useRef<HTMLDivElement>(null);
  const selected = MODULES.find((module) => module.id === selectedId) ?? MODULES[0];
  const groupId = selected.group;
  const moduleId = selected.id as ModuleId;
  const change = (next: Matrix) => {
    if (editable && next !== value) onChange?.(next);
  };

  const summary = (id: string) => {
    const module = MODULES.find((item) => item.id === id)!;
    const applicable = ACTIONS.filter((action) => cellState(module, action, value, roleId) !== 'not_applicable' && cellState(module, action, value, roleId) !== 'restricted');
    const granted = applicable.filter((action) => cellState(module, action, value, roleId) === 'granted');
    return { granted: granted.length, total: applicable.length };
  };

  const groupSummary = (id: ModuleGroupId) =>
    modulesInGroup(id).reduce((sum, module) => {
      const { granted, total } = summary(module.id);
      return { granted: sum.granted + granted, total: sum.total + total };
    }, { granted: 0, total: 0 });

  const chooseGroup = (id: ModuleGroupId) => {
    const first = modulesInGroup(id)[0];
    if (first) setSelectedId(first.id as ModuleId);
  };

  const choose = (id: string) => {
    setSelectedId(id as ModuleId);
    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      window.setTimeout(() => detailRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' }), 0);
    }
  };

  const rowFull = isRowFullyGranted(value, moduleId, roleId);
  const hasGrantable = ACTIONS.some((action) => isGrantable(selected, action, roleId));

  return (
    <div className="mv-perm-explorer">
      <nav className="mv-perm-areas" aria-label="Product areas">
        <ul>
          {MODULE_GROUPS.map((group) => {
            const { granted, total } = groupSummary(group.id);
            const active = group.id === groupId;
            return (
              <li key={group.id}>
                <button type="button" className={`mv-perm-module${active ? ' is-active' : ''}`} aria-current={active ? 'true' : undefined} onClick={() => chooseGroup(group.id)}>
                  <span className="mv-perm-module-name">{group.label}</span>
                  <span className={`mv-perm-module-count${granted > 0 ? ' has-grants' : ''}`} aria-label={`${granted} of ${total} actions granted`}>{granted}/{total}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav className="mv-perm-modules" aria-label={`Modules for the ${roleName} role`}>
        <ul>
          {modulesInGroup(groupId).map((module) => {
            const { granted, total } = summary(module.id);
            const active = module.id === selected.id;
            return (
              <li key={module.id}>
                <button type="button" className={`mv-perm-module${active ? ' is-active' : ''}`} aria-current={active ? 'true' : undefined} onClick={() => choose(module.id)}>
                  <span className="mv-perm-module-name">{module.label}</span>
                  <span className={`mv-perm-module-count${granted > 0 ? ' has-grants' : ''}`} aria-label={`${granted} of ${total} actions granted`}>{granted}/{total}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mv-perm-detail" ref={detailRef} role="group" aria-labelledby="perm-detail-title">
        <header className="mv-perm-detail-head">
          <div>
            <h3 id="perm-detail-title" className="mv-perm-detail-title">{selected.label}</h3>
            <p className="mv-muted">{selected.description}</p>
          </div>
          {editable && hasGrantable && (
            <button
              type="button"
              className="mv-matrix-all"
              aria-pressed={rowFull}
              aria-label={`${rowFull ? 'Remove all' : 'Grant all'} actions on ${selected.label}`}
              onClick={() => change(setRow(value, moduleId, !rowFull, roleId))}
            >
              {rowFull ? 'None' : 'All'}
            </button>
          )}
        </header>
        <ul className="mv-perm-actions">
          {ACTIONS.map((action) => {
            const state = cellState(selected, action, value, roleId);
            const label = `${ACTION_LABELS[action]}: ${selected.label}`;
            return (
              <li key={action} className="mv-perm-action" data-state={state}>
                <div className="mv-perm-action-text">
                  <span className="mv-perm-action-name">{ACTION_LABELS[action]}</span>
                  <span className="mv-perm-action-hint">
                    {state === 'not_applicable' ? 'Not applicable to this module' : state === 'restricted' ? 'Only the Owner role can hold this' : ACTION_HINTS[action]}
                  </span>
                </div>
                {state === 'not_applicable' && <span className="mv-matrix-na" role="img" aria-label={`${label}: not applicable`} />}
                {state === 'restricted' && <span className="mv-matrix-na mv-matrix-na--restricted" role="img" aria-label={`${label}: only the Owner role can hold this`} />}
                {(state === 'granted' || state === 'not_granted') && (
                  <button
                    type="button"
                    role="switch"
                    className="mv-toggle"
                    aria-checked={state === 'granted'}
                    aria-label={label}
                    disabled={!editable}
                    onClick={() => change(toggleCell(value, moduleId, action, roleId))}
                  />
                )}
              </li>
            );
          })}
        </ul>
        <p className="mv-muted mv-matrix-hint">Turning on any action also turns on View; turning View off clears the rest.</p>
      </div>
    </div>
  );
}
