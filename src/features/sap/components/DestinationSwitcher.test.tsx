import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DestinationSwitcher } from './DestinationSwitcher';

describe('DestinationSwitcher', () => {
  beforeEach(() => sessionStorage.clear());

  it('keeps the chosen SAP system when the user moves to another SAP page', async () => {
    const user = userEvent.setup();
    const jobsPage = render(<DestinationSwitcher />);
    await user.click(screen.getByLabelText('Destination'));
    await user.click(screen.getByRole('option', { name: 'MSQ' }));
    jobsPage.unmount();

    // A different SAP page mounts its own switcher.
    render(<DestinationSwitcher />);
    expect(screen.getByLabelText('Destination')).toHaveTextContent('MSQ');
  });
});
