import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider, useConfirm } from './ConfirmProvider';

const confirmMock = vi.fn();

vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>();
  return {
    ...actual,
    App: {
      ...actual.App,
      useApp: () => ({
        message: {},
        notification: {},
        modal: { confirm: confirmMock },
      }),
    },
  };
});

function Harness() {
  const confirm = useConfirm();
  const [result, setResult] = useState('pending');

  return (
    <button
      onClick={async () => {
        const ok = await confirm({ title: 'Remove saved view', variant: 'delete' });
        setResult(ok ? 'confirmed' : 'cancelled');
      }}
    >
      go: {result}
    </button>
  );
}

describe('ConfirmProvider', () => {
  beforeEach(() => {
    confirmMock.mockReset();
  });

  it('resolves true when the modal calls onOk', async () => {
    confirmMock.mockImplementation((opts: any) => opts.onOk());
    const user = userEvent.setup();
    render(
      <ConfirmProvider>
        <Harness />
      </ConfirmProvider>,
    );
    await user.click(screen.getByRole('button'));
    expect(await screen.findByText('go: confirmed')).toBeInTheDocument();
  });

  it('resolves false when the modal calls onCancel', async () => {
    confirmMock.mockImplementation((opts: any) => opts.onCancel());
    const user = userEvent.setup();
    render(
      <ConfirmProvider>
        <Harness />
      </ConfirmProvider>,
    );
    await user.click(screen.getByRole('button'));
    expect(await screen.findByText('go: cancelled')).toBeInTheDocument();
  });

  it('passes the title through to modal.confirm', async () => {
    confirmMock.mockImplementation((opts: any) => opts.onOk());
    const user = userEvent.setup();
    render(
      <ConfirmProvider>
        <Harness />
      </ConfirmProvider>,
    );
    await user.click(screen.getByRole('button'));
    expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Remove saved view' }));
  });
});
