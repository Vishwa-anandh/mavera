import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchField } from './SearchField';
import { FilterBar } from './FilterBar';
import { FilterChips } from './FilterChips';

describe('SearchField', () => {
  it('is a labelled search box that reports what is typed', async () => {
    const onChange = vi.fn();
    render(<SearchField label="Search jobs" value="" onChange={onChange} />);
    const box = screen.getByRole('searchbox', { name: 'Search jobs' });
    expect(box).toHaveAttribute('placeholder', 'Search jobs…');
    await userEvent.setup().type(box, 'ab');
    expect(onChange).toHaveBeenLastCalledWith('b');
  });

  it('uses a custom placeholder when given', () => {
    render(<SearchField label="Search jobs" placeholder="Search jobs..." value="x" onChange={() => {}} />);
    expect(screen.getByRole('searchbox')).toHaveValue('x');
    expect(screen.getByPlaceholderText('Search jobs...')).toBeInTheDocument();
  });
});

describe('FilterBar', () => {
  it('is a named search region around the search box and its filters', () => {
    render(<FilterBar label="Filter jobs"><SearchField label="Search jobs" value="" onChange={() => {}} /></FilterBar>);
    expect(screen.getByRole('search', { name: 'Filter jobs' })).toContainElement(screen.getByRole('searchbox'));
  });
});

describe('FilterChips', () => {
  const chips = [{ value: 'All', label: 'All', count: 20 }, { value: 'Running', label: 'Running', count: 1 }];
  it('shows counts, marks the chosen chip pressed and reports a change', async () => {
    const onChange = vi.fn();
    render(<FilterChips label="Filter jobs by status" chips={chips} value="All" onChange={onChange} />);
    expect(screen.getByRole('button', { name: /^All\s*20$/ })).toHaveAttribute('aria-pressed', 'true');
    const running = screen.getByRole('button', { name: /^Running\s*1$/ });
    expect(running).toHaveAttribute('aria-pressed', 'false');
    await userEvent.setup().click(running);
    expect(onChange).toHaveBeenCalledWith('Running');
  });
});
