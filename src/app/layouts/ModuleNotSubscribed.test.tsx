import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ModuleNotSubscribed } from './ModuleNotSubscribed';

describe('ModuleNotSubscribed', () => {
  it.each([['sapMonitoring', 'SAP Monitoring'], ['cloudCost', 'Cloud Cost']] as const)('names the missing %s module and links to the subscription and the dashboard', (module, label) => {
    render(<MemoryRouter><ModuleNotSubscribed module={module} /></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent(`${label} isn’t part of your subscription`);
    expect(screen.getByRole('link', { name: 'View subscription' })).toHaveAttribute('href', '/subscription');
    expect(screen.getByRole('link', { name: 'Go to dashboard' })).toHaveAttribute('href', '/');
  });
});
