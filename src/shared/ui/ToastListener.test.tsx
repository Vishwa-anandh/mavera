import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
