import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { START_PAGE_TOUR_EVENT } from '../lib/assistantEvents';
import { PageTourProvider } from '../lib/pageTourContext';
import { PageHeader } from './PageHeader';
import { PageTourButton } from './PageTourButton';

describe('PageTourButton', () => {
  it('starts the tour of the page with one click', async () => {
    const started = vi.fn();
    window.addEventListener(START_PAGE_TOUR_EVENT, started);
    render(<PageTourProvider value><PageTourButton /></PageTourProvider>);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Take a tour of this page' }));
    expect(started).toHaveBeenCalledTimes(1);
    window.removeEventListener(START_PAGE_TOUR_EVENT, started);
  });

  it('explains itself with the custom tooltip on keyboard focus, with no native title', async () => {
    render(<PageTourProvider value><PageTourButton /></PageTourProvider>);
    await userEvent.setup().tab();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Take a quick tour of this page');
    expect(screen.getByRole('button', { name: 'Take a tour of this page' })).not.toHaveAttribute('title');
  });

  it('renders nothing on a page that has no tour', () => {
    const { container } = render(<PageTourProvider value={false}><PageTourButton /></PageTourProvider>);
    expect(container).toBeEmptyDOMElement();
    const outside = render(<PageTourButton />);
    expect(outside.container).toBeEmptyDOMElement();
  });

  it('sits in every PageHeader of a page with a tour, after the page actions, and is absent otherwise', () => {
    const header = (hasTour: boolean) => (
      <MemoryRouter><PageTourProvider value={hasTour}><PageHeader title="Budgets"><button type="button">Create budget</button></PageHeader></PageTourProvider></MemoryRouter>
    );
    const { unmount } = render(header(true));
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Create budget', '?']);
    expect(screen.getByRole('button', { name: 'Take a tour of this page' })).toBeInTheDocument();
    unmount();
    render(header(false));
    expect(screen.queryByRole('button', { name: /tour/i })).toBeNull();
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Create budget']);
  });

  it('does not add an empty actions container to a header without actions or tour', () => {
    const { container } = render(<MemoryRouter><PageHeader title="Plain" /></MemoryRouter>);
    expect(container.querySelector('.mv-heading-actions')).toBeNull();
  });
});
