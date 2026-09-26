import { useEffect } from 'react';
import { App as AntdApp } from 'antd';
import { subscribeToToasts } from '../lib/toastEvents';

export function ToastListener() {
  const { message } = AntdApp.useApp();

  useEffect(() => {
    return subscribeToToasts((detail) => {
      void message[detail.type](detail.message);
    });
  }, [message]);

  return null;
}
