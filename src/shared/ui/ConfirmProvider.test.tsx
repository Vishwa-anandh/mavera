import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
