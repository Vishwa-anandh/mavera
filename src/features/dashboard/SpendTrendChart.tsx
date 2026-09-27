import { useState } from 'react';
import { Button, Modal, Table } from 'antd';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMaveraTheme } from '../../theme/ThemeProvider';
import { chartColors } from '../../theme/tokens';

export interface SpendTrendPoint {
  date: string;
  amount: number;
}

export function SpendTrendChart({ data }: { data: SpendTrendPoint[] }) {
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  const [tableOpen, setTableOpen] = useState(false);

  if (data.length === 0) {
    return <p>No spend history available for this period.</p>;
  }

  return (
    <div>
      <div role="img" aria-label="Daily spend trend" style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer>
          <AreaChart data={data}>
            <CartesianGrid stroke={colors.grid} vertical={false} />
            <XAxis dataKey="date" stroke={colors.axis} tick={{ fontSize: 12 }} />
            <YAxis stroke={colors.axis} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Area type="monotone" dataKey="amount" stroke={colors.primary} fill={colors.primary} fillOpacity={0.15} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <Button type="link" onClick={() => setTableOpen(true)}>
        View data
      </Button>
      <Modal title="Daily spend trend" open={tableOpen} onCancel={() => setTableOpen(false)} footer={null}>
        <Table
          dataSource={data}
          rowKey="date"
          pagination={false}
          columns={[
            { title: 'Date', dataIndex: 'date' },
            { title: 'Amount', dataIndex: 'amount', render: (value: number) => value.toFixed(2) },
          ]}
        />
      </Modal>
    </div>
  );
}
