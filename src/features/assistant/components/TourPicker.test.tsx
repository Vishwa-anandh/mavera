import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TourPicker } from './TourPicker';
import { flowGuideForPath } from '../model/flowGuides';
import { onboardingFlowsFor } from '../model/onboardingFlows';

describe('TourPicker', () => {
  const guide = flowGuideForPath('/users')!;

  it('lists the page overview and every task tour, with step counts', () => {
    render(<TourPicker guide={guide} onPick={() => {}} onBack={() => {}} />);
    expect(screen.getByRole('button', { name: /User Management overview/ })).toBeInTheDocument();
    for (const flow of guide.flows!) expect(screen.getByRole('button', { name: new RegExp(flow.label) })).toBeInTheDocument();
    expect(screen.getByText(/1 step\b/)).toBeInTheDocument();
  });

  it('picks the overview with no flow and a task tour with its flow, and can go back', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const onBack = vi.fn();
    render(<TourPicker guide={guide} onPick={onPick} onBack={onBack} />);

    await user.click(screen.getByRole('button', { name: /User Management overview/ }));
    expect(onPick).toHaveBeenLastCalledWith(undefined);

    await user.click(screen.getByRole('button', { name: /Add a user/ }));
    expect(onPick).toHaveBeenLastCalledWith(expect.objectContaining({ key: 'add-user' }));

    await user.click(screen.getByRole('button', { name: /Back to chat/ }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('TourPicker getting started', () => {
  const flows = onboardingFlowsFor({ cloudCost: true, sapMonitoring: true });

  it('lists the getting-started flows under their own heading and starts the one chosen', async () => {
    const user = userEvent.setup();
    const onPickFlow = vi.fn();
    render(<TourPicker guide={flowGuideForPath('/users')!} onPick={() => {}} gettingStarted={flows} onPickFlow={onPickFlow} onBack={() => {}} />);

    expect(screen.getByRole('heading', { name: 'Guided tours on this page' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Getting started' })).toBeInTheDocument();
    for (const flow of flows) expect(screen.getByRole('button', { name: new RegExp(flow.label) })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Connect Azure/ }));
    expect(onPickFlow).toHaveBeenCalledWith(expect.objectContaining({ key: 'connect-azure' }));
  });

  it('still lists them on a page that has no tour of its own', () => {
    render(<TourPicker onPick={() => {}} gettingStarted={flows} onPickFlow={() => {}} onBack={() => {}} />);
    expect(screen.queryByRole('heading', { name: 'Guided tours on this page' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Getting started' })).toBeInTheDocument();
  });
});
