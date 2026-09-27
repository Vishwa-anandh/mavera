import { useState } from 'react';
import { Alert, Button, Card, Col, Row, Skeleton, Statistic, Typography } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { derivePermissions } from '../../lib/permissions';
import { useDashboardData } from './useDashboardData';
import { EmptyState } from '../../components/EmptyState';
import { SpendTrendChart } from './SpendTrendChart';
import { ConnectCloudAccountWizard } from './ConnectCloudAccountWizard';

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

interface KpiCardProps {
  title: string;
  loading: boolean;
  error: string | null;
  value: string | number | null;
}

function KpiCard({ title, loading, error, value }: KpiCardProps) {
  return (
    <Card>
      {loading ? (
        <Skeleton active paragraph={false} />
      ) : error ? (
        <Alert type="error" showIcon title={error} />
      ) : (
        <Statistic title={title} value={value ?? '—'} />
      )}
    </Card>
  );
}

export function HomePage() {
  const { user, cloudAccess, invoiceOnly } = useAuth();
  const permissions = derivePermissions(user, cloudAccess, invoiceOnly);
  const { summary, recommendations, smartAlerts, budgets, mspSavings, invoices } = useDashboardData();
  const [wizardProvider, setWizardProvider] = useState<'azure' | 'aws' | null>(null);

  const noCloudAccessAtAll =
    !permissions.azure.orgHasAccess &&
    !permissions.aws.orgHasAccess &&
    !permissions.btp.orgHasAccess &&
    !permissions.gcp.orgHasAccess;

  if (noCloudAccessAtAll && !invoiceOnly) {
    return (
      <EmptyState
        icon={<span aria-hidden>☁️</span>}
        heading="Connect your first cloud account"
        explanation="Add an Azure, AWS, SAP BTP, or Google Cloud account to start monitoring costs."
      />
    );
  }

  const connectableProvider: 'azure' | 'aws' | null = permissions.azure.allowConnect
    ? 'azure'
    : permissions.aws.allowConnect
      ? 'aws'
      : null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={3} className="mv-heading" style={{ margin: 0 }}>
          Dashboard
        </Typography.Title>
        {connectableProvider && (
          <Button type="primary" onClick={() => setWizardProvider(connectableProvider)}>
            Connect a cloud account
          </Button>
        )}
      </div>

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <KpiCard
            title={summary.data?.periodLabel ?? 'Total spend'}
            loading={summary.loading}
            error={summary.error}
            value={summary.data ? formatCurrency(summary.data.totalSpend, summary.data.currency) : null}
          />
        </Col>
        <Col span={8}>
          <KpiCard
            title="Open recommendations"
            loading={recommendations.loading}
            error={recommendations.error}
            value={recommendations.data?.length ?? null}
          />
        </Col>
        <Col span={8}>
          <KpiCard
            title="Active alerts"
            loading={smartAlerts.loading}
            error={smartAlerts.error}
            value={smartAlerts.data?.length ?? null}
          />
        </Col>
        <Col span={8}>
          <KpiCard
            title="Tracked budgets"
            loading={budgets.loading}
            error={budgets.error}
            value={budgets.data?.length ?? null}
          />
        </Col>
        <Col span={8}>
          <KpiCard
            title="Estimated MSP savings"
            loading={mspSavings.loading}
            error={mspSavings.error}
            value={mspSavings.data ? formatCurrency(mspSavings.data.estimatedSavings, mspSavings.data.currency) : null}
          />
        </Col>
        <Col span={8}>
          <KpiCard
            title="Invoices on file"
            loading={invoices.loading}
            error={invoices.error}
            value={invoices.data?.length ?? null}
          />
        </Col>
      </Row>

      <Card title="Daily spend trend" style={{ marginTop: 16 }}>
        {summary.loading ? (
          <Skeleton active />
        ) : summary.error ? (
          <Alert type="error" showIcon title={summary.error} />
        ) : (
          <SpendTrendChart data={summary.data?.dailyTrend ?? []} />
        )}
      </Card>

      {wizardProvider && (
        <ConnectCloudAccountWizard provider={wizardProvider} open onClose={() => setWizardProvider(null)} />
      )}
    </div>
  );
}
