import { EmptyState } from '../../../shared/ui/EmptyState';
import { CloudIcon, ServerIcon } from '../../../shared/ui/icons';
import { CONNECT_TARGETS, openConnectTarget, type ConnectTargetKey } from '../model/connectTargets';

interface NothingConnectedProps {
  /** Which connect flow the one primary action opens. */
  target: ConnectTargetKey;
  heading: string;
  explanation: string;
  /** Overrides the action's default label. */
  actionLabel?: string;
}

/**
 * The empty state of a page whose data comes from a connection the organisation has not made yet: one sentence
 * on what will appear, and ONE primary action that opens the shared connect dialog in place.
 */
export function NothingConnected({ target, heading, explanation, actionLabel }: NothingConnectedProps) {
  const connect = CONNECT_TARGETS[target];
  return (
    <EmptyState
      icon={target === 'sap' ? <ServerIcon size={28} /> : <CloudIcon size={28} />}
      heading={heading}
      explanation={explanation}
      actionLabel={actionLabel ?? connect.label}
      onAction={() => openConnectTarget(target)}
    />
  );
}
