import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InsightList } from './InsightList';

describe('InsightList', () => {
  it('shows the empty message when there is nothing to report', () => {
    render(<InsightList items={[]} label="Findings" empty="All quiet." />);
    expect(screen.getByText('All quiet.')).toBeInTheDocument();
  });

  it('names each row’s tone for screen readers, so colour is never the only signal', () => {
    render(
      <MemoryRouter>
        <InsightList label="Findings" items={[{ id: '1', tone: 'danger', title: 'HANA-PRD is critical', detail: 'CPU 92%' }]} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('list', { name: 'Findings' })).toBeInTheDocument();
    expect(screen.getByText('Critical:')).toHaveClass('mv-sr-only');
    expect(screen.getByText('CPU 92%')).toBeInTheDocument();
  });

  it('turns a row into a link only when it has a destination', () => {
    render(
      <MemoryRouter>
        <InsightList
          label="Findings"
          items={[
            { id: '1', tone: 'warning', title: 'Linked', to: '/sap/jobs#dumps' },
            { id: '2', tone: 'info', title: 'Plain' },
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /Linked/ })).toHaveAttribute('href', '/sap/jobs#dumps');
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });
});
