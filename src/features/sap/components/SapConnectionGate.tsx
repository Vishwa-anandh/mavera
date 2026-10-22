import type { ReactNode } from 'react';
import { sapRepository } from '../../../data-access';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { NothingConnected } from '../../workspace';

interface SapConnectionGateProps {
  /** Page heading shown while no system is connected. */
  title: string;
  subtitle: string;
  /** What this page will show once a system is connected, completing "…appear here". */
  willShow: string;
  children: ReactNode;
}

/**
 * Wraps an SAP monitoring page: shows the page when at least one SAP system is connected, otherwise the page
 * heading and a single "Connect an SAP system" action (System Configuration with the Add form open).
 */
export function SapConnectionGate({ title, subtitle, willShow, children }: SapConnectionGateProps) {
  if (sapRepository.isConnected()) return <>{children}</>;
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <section className="mv-panel">
        <NothingConnected target="sap" heading="No SAP system connected yet" explanation={`Connect a system and ${willShow} appear here.`} />
      </section>
    </div>
  );
}
