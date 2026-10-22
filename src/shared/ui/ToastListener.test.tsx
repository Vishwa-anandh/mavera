import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ToastListener } from './ToastListener';
import { fireToast } from '../lib/toastEvents';

describe('ToastListener', () => {
  it('renders an error toast with the message text and the matching tone class', async () => {
    render(<ToastListener />);
    fireToast({ type: 'error', message: 'Request failed' });
    const toast = await screen.findByText('Request failed');
    expect(toast).toHaveClass('mv-toast', 'mv-toast--error');
  });

  it('renders a success toast with the matching tone class', async () => {
    render(<ToastListener />);
    fireToast({ type: 'success', message: 'Saved' });
    const toast = await screen.findByText('Saved');
    expect(toast).toHaveClass('mv-toast', 'mv-toast--success');
  });

  it('offers an action inside the toast, runs it once and closes the toast', async () => {
    const onUndo = vi.fn();
    render(<ToastListener />);
    fireToast({ type: 'success', message: 'Invoice deleted.', action: { label: 'Undo', onClick: onUndo } });
    const toast = (await screen.findByText('Invoice deleted.')) as HTMLElement;
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(toast).not.toBeInTheDocument();
  });

  it('shows no button for a toast without an action', async () => {
    render(<ToastListener />);
    fireToast({ type: 'info', message: 'Plain' });
    await screen.findByText('Plain');
    expect(screen.queryByRole('button')).toBeNull();
  });
});
