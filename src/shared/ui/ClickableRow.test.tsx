import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClickableRow, RowChevronCell, RowOpenButton } from './ClickableRow';

function renderRow(onOpen: () => void) {
  render(
    <table>
      <tbody>
        <ClickableRow onOpen={onOpen}>
          <td><RowOpenButton onOpen={onOpen}>Production Environment</RowOpenButton></td>
          <td>$14,280.55</td>
          <td><button type="button">Other action</button></td>
          <RowChevronCell />
        </ClickableRow>
      </tbody>
    </table>,
  );
}

describe('ClickableRow', () => {
  it('opens the item when any plain cell of the row is clicked', async () => {
    const onOpen = vi.fn();
    renderRow(onOpen);
    await userEvent.setup().click(screen.getByText('$14,280.55'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('opens the item from the name button, once, for keyboard and assistive-technology users', async () => {
    const onOpen = vi.fn();
    renderRow(onOpen);
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Production Environment' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('leaves other controls in the row alone', async () => {
    const onOpen = vi.fn();
    renderRow(onOpen);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Other action' }));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('hides the chevron from assistive technology', () => {
    renderRow(() => {});
    expect(document.querySelector('.mv-row-chevron')).toHaveAttribute('aria-hidden', 'true');
  });
});
