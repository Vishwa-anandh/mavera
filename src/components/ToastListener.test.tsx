import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ToastListener } from './ToastListener';
import { fireToast } from '../lib/toastEvents';

const errorMock = vi.fn();
const warningMock = vi.fn();
const successMock = vi.fn();
const infoMock = vi.fn();

vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>();
  return {
    ...actual,
    App: {
      ...actual.App,
      useApp: () => ({
        message: { error: errorMock, warning: warningMock, success: successMock, info: infoMock },
        notification: {},
        modal: {},
      }),
    },
  };
});

describe('ToastListener', () => {
  beforeEach(() => {
    errorMock.mockClear();
    warningMock.mockClear();
    successMock.mockClear();
    infoMock.mockClear();
  });

  it('calls message.error for an error toast', () => {
    render(<ToastListener />);
    fireToast({ type: 'error', message: 'Request failed' });
    expect(errorMock).toHaveBeenCalledWith('Request failed');
  });

  it('calls message.success for a success toast', () => {
    render(<ToastListener />);
    fireToast({ type: 'success', message: 'Saved' });
    expect(successMock).toHaveBeenCalledWith('Saved');
  });
});
