import type { ReactNode } from 'react';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { NothingConnected, useCloudEmpty } from '../../workspace';

interface CloudConnectionGateProps {
  title: string;
  subtitle: string;
  /** What the page will show once an account is connected, completing "Connect an account and … appear here". */
  willShow: string;
  children: ReactNode;
}

/**
 * Wraps a Cloud Cost page: shows the page once at least one cloud account is connected, otherwise the page
 * heading and a single "Connect your first account" action. Organisations that already have accounts (or real
 * data) never see the empty state.
 */
export function CloudConnectionGate({ title, subtitle, willShow, children }: CloudConnectionGateProps) {
  const cloudEmpty = useCloudEmpty();
  if (!cloudEmpty) return <>{children}</>;
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <section className="mv-panel">
        <NothingConnected target="cloud" heading="No cloud account connected yet" explanation={`Connect an account and ${willShow} appear here.`} />
      </section>
    </div>
  );
}
