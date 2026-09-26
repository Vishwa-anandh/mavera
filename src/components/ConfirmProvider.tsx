import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { App as AntdApp } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined, LogoutOutlined, WarningOutlined } from '@ant-design/icons';

export type ConfirmVariant = 'delete' | 'logout' | 'warning' | 'danger';

export interface ConfirmOptions {
  title: string;
  description?: string;
  variant?: ConfirmVariant;
  okText?: string;
  cancelText?: string;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

const VARIANT_ICON: Record<ConfirmVariant, ReactNode> = {
  delete: <DeleteOutlined />,
  logout: <LogoutOutlined />,
  warning: <WarningOutlined />,
  danger: <ExclamationCircleOutlined />,
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { modal } = AntdApp.useApp();

  const confirm = useMemo<ConfirmFn>(
    () => (options) =>
      new Promise<boolean>((resolve) => {
        modal.confirm({
          title: options.title,
          content: options.description,
          icon: VARIANT_ICON[options.variant ?? 'warning'],
          okText: options.okText ?? 'Confirm',
          cancelText: options.cancelText ?? 'Cancel',
          okButtonProps:
            options.variant === 'delete' || options.variant === 'danger' ? { danger: true } : undefined,
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      }),
    [modal],
  );

  return <ConfirmContext.Provider value={confirm}>{children}</ConfirmContext.Provider>;
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}
