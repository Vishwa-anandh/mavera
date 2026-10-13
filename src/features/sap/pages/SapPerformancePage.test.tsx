import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SapPerformancePage } from './SapPerformancePage';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';

const renderPage = () => render(<ThemeProvider><MemoryRouter><SapPerformancePage /></MemoryRouter></ThemeProvider>);

describe('SapPerformancePage', () => {
  it('shows "Not reported" instead of a misleading 0% for metrics the SAP system did not send', () => {
    renderPage();

    expect(screen.getByLabelText('DB Hit Ratio not reported')).toHaveTextContent('—');
    expect(screen.getByLabelText('Memory Usage not reported')).toHaveTextContent('—');
    expect(screen.getAllByText('Not reported by this system')).toHaveLength(2);
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('lists each application server as its own card with readable metrics', () => {
    renderPage();
    expect(screen.getByText('1 instance')).toBeInTheDocument();
    expect(screen.getByText('sapgrc_GRC_00')).toBeInTheDocument();
    expect(screen.getByText('Dialog steps')).toBeInTheDocument();
  });
});
