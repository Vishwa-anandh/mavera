import type { ReactNode } from 'react';
import { ChevronRightIcon } from './icons';

interface ClickableRowProps {
  /** Opens the thing the row stands for (an account, a project...). */
  onOpen: () => void;
  children: ReactNode;
}

/**
 * A table row that opens its item when clicked anywhere. Mouse users get the whole row as the target (pointer,
 * hover highlight, chevron); keyboard and screen-reader users get the real button from `RowOpenButton` in the
 * name cell, so nothing depends on the row's own click. Clicks on controls inside the row are left alone.
 */
export function ClickableRow({ onOpen, children }: ClickableRowProps) {
  return (
    <tr
      className="mv-row-link"
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('a, button, input, select, textarea, label')) return;
        onOpen();
      }}
    >
      {children}
    </tr>
  );
}

/** The name of a clickable row as a real button: the keyboard and assistive-technology way to open it. */
export function RowOpenButton({ onOpen, children }: { onOpen: () => void; children: ReactNode }) {
  return <button type="button" className="mv-row-open" onClick={onOpen}>{children}</button>;
}

/** The trailing cell of a clickable row: a chevron that says "this opens". Hidden from assistive technology. */
export function RowChevronCell() {
  return <td className="mv-row-chevron" aria-hidden="true"><ChevronRightIcon size={16} /></td>;
}
