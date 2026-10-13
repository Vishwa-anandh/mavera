import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotFoundPage } from './NotFoundPage';

describe('NotFoundPage', () => {
  it('renders a 404 message with a link back to the dashboard', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("Sorry, this page doesn't exist.")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toHaveAttribute('href', '/');
  });
});
