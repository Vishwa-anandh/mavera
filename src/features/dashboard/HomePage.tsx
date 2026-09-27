import { useState } from 'react';
import { Alert, Button, Card, Col, Row, Skeleton, Statistic, Typography } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { derivePermissions } from '../../lib/permissions';
import {
  activeAlertCountOf,
  budgetCountOf,
  invoiceCountOf,
  monthlyTrendOf,
  mspSavingsTotalOf,
  recommendationCountOf,
  totalSpendOf,
  useDashboardData,
} from './useDashboardData';
import { EmptyState } from '../../components/EmptyState';
import { SpendTrendChart } from './SpendTrendChart';
import { ConnectCloudAccountWizard } from './ConnectCloudAccountWizard';

// The reference app formats every dashboard amount as USD; the backend's
// /summary/dashboard and /insights/msp-savings payloads carry no currency.
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
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
            title="Total cloud spend"
            loading={summary.loading}
            error={summary.error}
            value={summary.data ? formatCurrency(totalSpendOf(summary.data)) : null}
          />
        </Col>
        <Col span={8}>
          <KpiCard
            title="Open recommendations"
            loading={recommendations.loading}
            error={recommendations.error}
            value={recommendations.data ? recommendationCountOf(recommendations.data) : null}
          />
        </Col>
        <Col span={8}>
          <KpiCard
            title="Active alerts"
            loading={smartAlerts.loading}
            error={smartAlerts.error}
            value={smartAlerts.data ? activeAlertCountOf(smartAlerts.data) : null}
          />
        </Col>
        <Col span={8}>
          <KpiCard
            title="Tracked budgets"
            loading={budgets.loading}
            error={budgets.error}
            value={budgets.data ? budgetCountOf(budgets.data) : null}
          />
        </Col>
        <Col span={8}>
          <KpiCard
            title="Estimated MSP savings"
            loading={mspSavings.loading}
            error={mspSavings.error}
            value={mspSavings.data ? formatCurrency(mspSavingsTotalOf(mspSavings.data)) : null}
          />
        </Col>
        <Col span={8}>
          <KpiCard
            title="Invoices on file"
            loading={invoices.loading}
            error={invoices.error}
            value={invoices.data ? invoiceCountOf(invoices.data) : null}
          />
        </Col>
      </Row>

      <Card title="Monthly spend trend" style={{ marginTop: 16 }}>
        {summary.loading ? (
          <Skeleton active />
        ) : summary.error ? (
          <Alert type="error" showIcon title={summary.error} />
        ) : (
          <SpendTrendChart title="Monthly spend trend" data={monthlyTrendOf(summary.data)} />
        )}
      </Card>

      {wizardProvider && (
        <ConnectCloudAccountWizard provider={wizardProvider} open onClose={() => setWizardProvider(null)} />
      )}
    </div>
  );
}
