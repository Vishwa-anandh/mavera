import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppBreadcrumb } from './AppBreadcrumb';

describe('AppBreadcrumb', () => {
  it('renders ancestor items as links and marks the current item with aria-current', () => {
    render(
      <MemoryRouter>
        <AppBreadcrumb
          items={[{ label: 'Dashboard', path: '/' }, { label: 'Cloud Costs', path: '/cloud' }, { label: 'Azure' }]}
        />
      </MemoryRouter>,
    );
    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    expect(dashboardLink).toHaveAttribute('href', '/');
    expect(screen.getByText('Azure')).toHaveAttribute('aria-current', 'page');
  });
});
