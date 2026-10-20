import { Fragment } from 'react';
import {
  ACTIONS,
  ACTION_LABELS,
  MODULE_GROUPS,
  modulesInGroup,
  type ModuleId,
  type PermissionAction,
} from '../model/modules';
import {
  cellState,
  isColumnApplicable,
  isColumnFullyGranted,
  isGrantable,
  isRowFullyGranted,
  setColumn,
  setRow,
  toggleCell,
  type PermissionMatrix as Matrix,
} from '../model/permissions';

interface PermissionMatrixProps {
  /** The role being shown; decides which cells are restricted (e.g. Owner-only actions). */
  roleId: string;
  roleName: string;
  value: Matrix;
  onChange?: (next: Matrix) => void;
  /** Shows the grants without letting them change (system roles, or no permission to edit roles). */
  readOnly?: boolean;
}

/** What the kinds of cell look like, so nobody has to guess what a dashed pill means. */
export function PermissionMatrixLegend() {
  return (
    <ul className="mv-matrix-legend" aria-label="Matrix legend">
      <li><span className="mv-toggle mv-matrix-sample" data-on="true" aria-hidden /> Granted</li>
      <li><span className="mv-toggle mv-matrix-sample" aria-hidden /> Not granted</li>
      <li><span className="mv-matrix-na" aria-hidden /> Not applicable to this module</li>
      <li><span className="mv-matrix-na mv-matrix-na--restricted" aria-hidden /> Owner only</li>
    </ul>
  );
}

/**
 * The permission matrix: modules grouped by product area down the side, actions across the top.
 * A cell is a switch, or a dashed pill when the action does not exist for that module or only the
 * Owner may hold it. Every row and column has an "All" control. Narrow screens stack each module
 * into a card with one labelled switch per action.
 */
export function PermissionMatrix({ roleId, roleName, value, onChange, readOnly = false }: PermissionMatrixProps) {
  const editable = !readOnly && Boolean(onChange);
  const change = (next: Matrix) => {
    if (editable && next !== value) onChange?.(next);
  };

  return (
    <div className="mv-matrix-scroll">
      <table className="mv-matrix">
        <caption className="mv-sr-only">
          Permissions for the {roleName} role. Rows are modules grouped by product area; columns are actions.
          {readOnly ? ' This matrix is read-only.' : ' Switches grant or remove an action.'}
        </caption>
        <thead>
          <tr>
            <th scope="col" className="mv-matrix-module-col">Module</th>
            {ACTIONS.map((action) => {
              const available = isColumnApplicable(action, roleId);
              const full = isColumnFullyGranted(value, action, roleId);
              return (
                <th scope="col" key={action} className="mv-matrix-action-col">
                  <span>{ACTION_LABELS[action]}</span>
                  {editable && available && (
                    <button
                      type="button"
                      className="mv-matrix-all"
                      aria-pressed={full}
                      aria-label={`${full ? 'Remove' : 'Grant'} ${ACTION_LABELS[action]} on every module`}
                      onClick={() => change(setColumn(value, action, !full, roleId))}
                    >
                      {full ? 'None' : 'All'}
                    </button>
                  )}
                </th>
              );
            })}
            <th scope="col" className="mv-matrix-action-col mv-matrix-row-col">
              <span>Whole row</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {MODULE_GROUPS.map((group) => (
            <Fragment key={group.id}>
              <tr className="mv-matrix-group">
                <th scope="colgroup" colSpan={ACTIONS.length + 2}>{group.label}</th>
              </tr>
              {modulesInGroup(group.id).map((module) => {
                const moduleId = module.id as ModuleId;
                const rowFull = isRowFullyGranted(value, moduleId, roleId);
                const hasGrantable = ACTIONS.some((action) => isGrantable(module, action, roleId));
                return (
                  <tr key={module.id}>
                    <th scope="row" className="mv-matrix-module">
                      <span className="mv-matrix-module-name">{module.label}</span>
                      <span className="mv-matrix-module-desc">{module.description}</span>
                    </th>
                    {ACTIONS.map((action: PermissionAction) => {
                      const state = cellState(module, action, value, roleId);
                      const label = `${ACTION_LABELS[action]}: ${module.label}`;
                      return (
                        <td key={action} data-label={ACTION_LABELS[action]} data-state={state}>
                          {state === 'not_applicable' && <span className="mv-matrix-na" role="img" aria-label={`${label}: not applicable`} />}
                          {state === 'restricted' && (
                            <span className="mv-matrix-na mv-matrix-na--restricted" role="img" aria-label={`${label}: only the Owner role can hold this`} title="Only the Owner role can hold this" />
                          )}
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
                        </td>
                      );
                    })}
                    <td data-label="Whole row" className="mv-matrix-row-cell">
                      {editable && hasGrantable ? (
                        <button
                          type="button"
                          className="mv-matrix-all"
                          aria-pressed={rowFull}
                          aria-label={`${rowFull ? 'Remove all' : 'Grant all'} actions on ${module.label}`}
                          onClick={() => change(setRow(value, moduleId, !rowFull, roleId))}
                        >
                          {rowFull ? 'None' : 'All'}
                        </button>
                      ) : (
                        <span className="mv-muted" aria-hidden>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
