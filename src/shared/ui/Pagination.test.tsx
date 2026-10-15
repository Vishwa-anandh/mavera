import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination';
import { pageWindow } from './usePagination';

describe('pageWindow', () => {
  it('lists every page when there are 7 or fewer', () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('collapses the far end behind a gap near the start', () => {
    expect(pageWindow(1, 20)).toEqual([1, 2, 3, 4, 5, 'gap-end', 20]);
  });

  it('collapses both ends around a middle page', () => {
    expect(pageWindow(10, 20)).toEqual([1, 'gap-start', 9, 10, 11, 'gap-end', 20]);
  });

  it('collapses the near end behind a gap near the end', () => {
    expect(pageWindow(20, 20)).toEqual([1, 'gap-start', 16, 17, 18, 19, 20]);
  });
});

describe('Pagination', () => {
  it('shows the range summary and marks the current page', () => {
    render(<Pagination page={2} pageSize={10} total={34} onPageChange={() => {}} noun="logs" />);
    expect(screen.getByText(/11–20/)).toBeInTheDocument();
    expect(screen.getByText(/34/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
  });

  it('clamps the last page range to the total', () => {
    render(<Pagination page={4} pageSize={10} total={34} onPageChange={() => {}} />);
    expect(screen.getByText(/31–34/)).toBeInTheDocument();
  });

  it('disables previous on the first page and next on the last', () => {
    const { rerender } = render(<Pagination page={1} pageSize={10} total={30} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
    rerender(<Pagination page={3} pageSize={10} total={30} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('reports the chosen page', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination page={1} pageSize={10} total={30} onPageChange={onPageChange} />);
    await user.click(screen.getByRole('button', { name: 'Page 3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('hides the page buttons when everything fits on one page, and renders nothing when empty', () => {
    const { container, rerender } = render(<Pagination page={1} pageSize={10} total={7} onPageChange={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
    expect(screen.getByText(/1–7/)).toBeInTheDocument();
    rerender(<Pagination page={1} pageSize={10} total={0} onPageChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
