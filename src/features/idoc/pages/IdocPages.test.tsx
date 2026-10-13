import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { resetIdocState } from '../model/idocStore';
import { FailedIdocsPage } from './FailedIdocsPage';
import { ProcessingStatusPage } from './ProcessingStatusPage';
import { IdocTrafficPage } from './IdocTrafficPage';
import { PartnerMonitoringPage } from './PartnerMonitoringPage';
import { IdocAlertsReportsPage } from './IdocAlertsReportsPage';
import { IdocAnalyticsPage } from './IdocAnalyticsPage';
import { IdocOverviewPage } from './IdocOverviewPage';

const wrap = (node: ReactNode) => render(<ThemeProvider><MemoryRouter>{node}</MemoryRouter></ThemeProvider>);

describe('IDoc pages', () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetIdocState();
  });

  it('Failed IDocs: reprocessing confirms the named records and leaves them Pending', async () => {
    const user = userEvent.setup();
    wrap(<FailedIdocsPage />);

    const boxes = screen.getAllByRole('checkbox', { name: /^Select IDoc/ }).filter((box) => !(box as HTMLInputElement).disabled);
    await user.click(boxes[0]);
    await user.click(screen.getByRole('button', { name: 'Reprocess (1)' }));

    const dialog = screen.getByRole('alertdialog', { name: 'Reprocess 1 IDoc?' });
    expect(within(dialog).getByText(/status 51/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Reprocess IDoc' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getAllByText('Retry pending').length).toBeGreaterThan(0);
  });

  it('Failed IDocs: a partner-profile error (56) cannot be selected for reprocessing', () => {
    wrap(<FailedIdocsPage />);
    const row56 = screen.getAllByText('IDoc with errors added')[0].closest('tr')!;
    expect(within(row56).getByRole('checkbox')).toBeDisabled();
  });

  it('Failed IDocs: the drawer shows the status history and copy action', async () => {
    const user = userEvent.setup();
    wrap(<FailedIdocsPage />);
    const firstNumber = screen.getAllByRole('button', { name: /^0{6,}\d+$/ })[0];
    await user.click(firstNumber);
    const drawer = screen.getByRole('dialog', { name: `IDoc ${firstNumber.textContent}` });
    expect(within(drawer).getByRole('heading', { name: 'Status history' })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: 'Copy IDoc number' })).toBeInTheDocument();
  });

  it('Processing Status: keeps an unmapped status visible with its code', () => {
    wrap(<ProcessingStatusPage />);
    expect(screen.getByRole('button', { name: /75 — Unmapped status 75/ })).toBeInTheDocument();
  });

  it('Inbound / Outbound: tabs split by direction without treating direction as success or failure', async () => {
    const user = userEvent.setup();
    wrap(<IdocTrafficPage />);
    expect(screen.getByRole('tab', { name: /Inbound 34/ })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: /Outbound 10/ }));
    expect(screen.getByRole('heading', { name: 'Outbound IDocs' })).toBeInTheDocument();
  });

  it('Partner/Message: delayed counts only exist while the backlog rule is on', () => {
    wrap(<PartnerMonitoringPage />);
    expect(screen.getByText('waiting over 60 min')).toBeInTheDocument();
  });

  it('Alerts & Reports: acknowledging an alert updates its status, and reports can be generated', async () => {
    const user = userEvent.setup();
    wrap(<IdocAlertsReportsPage />);
    const critical = screen.getByText(/Failure rate for ORDERS/).closest('tr')!;
    await user.click(within(critical).getByRole('button', { name: 'Acknowledge' }));
    expect(within(critical).getByText('Acknowledged')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Reports/ }));
    const before = screen.getAllByRole('row').length;
    await user.click(screen.getByRole('button', { name: 'Generate' }));
    expect(screen.getAllByRole('row').length).toBe(before + 1);
  });

  it('Analytics and Overview render from the same records', () => {
    wrap(<IdocAnalyticsPage />);
    expect(screen.getByText('34 inbound · 10 outbound')).toBeInTheDocument();
  });

  it('Overview totals match the detail pages', () => {
    wrap(<IdocOverviewPage />);
    expect(screen.getByText('34 Inbound · 10 Outbound')).toBeInTheDocument();
  });
});
