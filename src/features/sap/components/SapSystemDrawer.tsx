import { Link } from 'react-router-dom';
import { sapRepository, type SapCondition, type SapSystem } from '../../../data-access';
import { DetailDrawer, DetailList } from '../../../shared/ui/DetailDrawer';
import { LOAD_THRESHOLD_PERCENT } from '../model/sapInsights';

const CONDITION_LABEL: Record<SapCondition, string> = { healthy: 'Healthy', warning: 'Warning', critical: 'Critical' };
const TONE: Record<SapCondition, string> = { healthy: 'success', warning: 'warning', critical: 'danger' };

/** What a system's figures mean, in plain words: which of CPU and memory is over the load threshold. */
function loadNote(system: SapSystem): string {
  const hot = [system.cpuPercent >= LOAD_THRESHOLD_PERCENT && 'CPU', system.memoryPercent >= LOAD_THRESHOLD_PERCENT && 'memory'].filter(Boolean);
  if (hot.length === 0) return `CPU and memory are both below the ${LOAD_THRESHOLD_PERCENT}% load threshold.`;
  return `${hot.join(' and ')} ${hot.length > 1 ? 'are' : 'is'} at or above the ${LOAD_THRESHOLD_PERCENT}% load threshold: check capacity or tuning.`;
}

/** Opens from a row of the Systems table: the system's figures and the pages that go deeper. */
export function SapSystemDrawer({ system, onClose }: { system: SapSystem; onClose: () => void }) {
  const hana = sapRepository.getHana().system;
  const isHana = system.name === hana.name || system.name.toUpperCase().startsWith('HANA');
  const unread = sapRepository.listAlerts().filter((alert) => alert.system === system.name && !alert.read).length;
  return (
    <DetailDrawer
      title={system.name}
      subtitle={<span className={`mv-status mv-status--${TONE[system.condition]}`}>{CONDITION_LABEL[system.condition]}</span>}
      onClose={onClose}
      footer={
        <>
          <Link className="mv-secondary-button" to="/sap/alerts">Open alerts</Link>
          <Link className="mv-secondary-button" to="/sap/performance">Open performance</Link>
          {isHana && <Link className="mv-primary-button" to="/sap/databases">Open HANA monitoring</Link>}
        </>
      }
    >
      <DetailList
        items={[
          { label: 'Environment', value: system.environment },
          { label: 'Condition', value: CONDITION_LABEL[system.condition] },
          { label: 'CPU', value: `${system.cpuPercent}%` },
          { label: 'Memory', value: `${system.memoryPercent}%` },
          { label: 'Unread alerts', value: unread },
          { label: 'Last collection', value: system.lastCollection },
        ]}
      />
      <p className="mv-muted">{loadNote(system)}</p>
    </DetailDrawer>
  );
}
