import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider, useConfirm } from './ConfirmProvider';

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
  it('resolves true and closes the dialog when Confirm is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmProvider>
        <Harness />
      </ConfirmProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'go: pending' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('go: confirmed')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('resolves false and closes the dialog when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmProvider>
        <Harness />
      </ConfirmProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'go: pending' }));
    await screen.findByRole('alertdialog');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByText('go: cancelled')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('renders the title passed to confirm()', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmProvider>
        <Harness />
      </ConfirmProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'go: pending' }));

    expect(await screen.findByText('Remove saved view')).toBeInTheDocument();
  });

  it('cancels with Escape, starts on Cancel, keeps Tab inside and returns focus to the control that asked', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmProvider>
        <Harness />
      </ConfirmProvider>,
    );

    const opener = screen.getByRole('button', { name: 'go: pending' });
    await user.click(opener);
    const dialog = await screen.findByRole('alertdialog', { name: 'Remove saved view' });
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.tab();
    expect(within(dialog).getByRole('button', { name: 'Confirm' })).toHaveFocus();
    await user.tab();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(await screen.findByRole('button', { name: 'go: cancelled' })).toHaveFocus();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
