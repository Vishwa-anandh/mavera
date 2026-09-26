import type { ReactNode } from 'react';
import { Button, Typography } from 'antd';

export interface EmptyStateProps {
  icon: ReactNode;
  heading: string;
  explanation: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, heading, explanation, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div role="status" style={{ textAlign: 'center', padding: 32 }}>
      <div aria-hidden="true" style={{ fontSize: 24, marginBottom: 16 }}>
        {icon}
      </div>
      <Typography.Title level={5} style={{ marginBottom: 8 }}>
        {heading}
      </Typography.Title>
      <Typography.Paragraph type="secondary">{explanation}</Typography.Paragraph>
      {actionLabel && onAction && (
        <Button type="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
