import { describe, expect, it } from 'vitest';
import { workspaceRepository } from '../../../data-access';
import { flowGuideForPath } from './flowGuides';
import { flowForChecklistStep, onboardingFlowByKey, onboardingFlowsFor, ONBOARDING_FLOWS } from './onboardingFlows';
import { isCoachStep, waitsOf } from './coachWaits';

const TARGET = /^(css|btn|panel):.+|^none:$/;
const SIGNALS = Object.keys(workspaceRepository.progressSignals());

describe('ONBOARDING_FLOWS', () => {
  it('has the eight flows with unique keys, chips and labels', () => {
    expect(ONBOARDING_FLOWS.map((f) => f.key)).toEqual([
      'connect-azure', 'connect-aws', 'connect-gcp', 'connect-btp', 'connect-sap', 'create-budget', 'add-alert-recipients', 'invite-teammate',
    ]);
    for (const field of ['key', 'chip', 'label'] as const) {
      const values = ONBOARDING_FLOWS.map((f) => f[field]);
      expect(new Set(values).size, field).toBe(values.length);
    }
  });

  it('writes every step with a title, a body and a well-formed target', () => {
    for (const flow of ONBOARDING_FLOWS) {
      expect(flow.steps.length, flow.key).toBeGreaterThan(1);
      for (const step of flow.steps) {
        expect(step.title, flow.key).toBeTruthy();
        expect(step.body, flow.key).toBeTruthy();
        expect(step.target, `${flow.key}: ${step.title}`).toMatch(TARGET);
        // a `css:` target must be a selector the browser accepts
        if (step.target.startsWith('css:')) expect(() => document.querySelector(step.target.slice(4)), step.target).not.toThrow();
      }
    }
  });

  it('writes every wait as something the coach can evaluate', () => {
    for (const flow of ONBOARDING_FLOWS) {
      for (const step of flow.steps) {
        for (const wait of waitsOf(step)) {
          if ('selector' in wait) expect(() => document.querySelector(wait.selector), `${flow.key}: ${wait.selector}`).not.toThrow();
          if (wait.kind === 'change') expect(SIGNALS, `${flow.key}`).toContain(wait.signal);
        }
        for (const field of step.fill ?? []) expect(() => document.querySelector(field.selector)).not.toThrow();
        if (step.action) expect(step.waitFor, `${flow.key}: ${step.title} asks for something but waits for nothing`).toBeDefined();
      }
    }
  });

  it('makes the first step reachable from any page: it moves the person (or opens the form) itself', () => {
    for (const flow of ONBOARDING_FLOWS) {
      const [first] = flow.steps;
      expect(isCoachStep(first), flow.key).toBe(true);
      expect(first.enter, `${flow.key} must open its own page or form`).toBeDefined();
      if (first.enter?.navigate) {
        const path = first.enter.navigate.split(/[?#]/)[0];
        expect(path.startsWith('/'), flow.key).toBe(true);
        expect(flowGuideForPath(path), `${flow.key} goes to ${path}, which must be a real page`).toBeDefined();
      }
    }
  });

  it('ends every flow on a closing note that waits for nothing, after a step that watches the work being done', () => {
    for (const flow of ONBOARDING_FLOWS) {
      const last = flow.steps[flow.steps.length - 1];
      expect(last.waitFor, flow.key).toBeUndefined();
      const doing = flow.steps[flow.steps.length - 2];
      expect(waitsOf(doing).some((w) => w.kind === 'change' && w.signal === flow.signal), flow.key).toBe(true);
    }
  });

  it('finds a flow by key and by checklist step, and drops flows of modules the organisation lacks', () => {
    expect(onboardingFlowByKey('connect-aws')?.chip).toBe('Help me connect AWS');
    expect(onboardingFlowByKey('nope')).toBeUndefined();
    expect(flowForChecklistStep('cloud')?.key).toBe('connect-azure');
    expect(flowForChecklistStep('sap')?.key).toBe('connect-sap');
    expect(flowForChecklistStep('budget')?.key).toBe('create-budget');
    expect(flowForChecklistStep('alerts')?.key).toBe('add-alert-recipients');
    expect(flowForChecklistStep('teammate')?.key).toBe('invite-teammate');
    expect(flowForChecklistStep('tour')).toBeUndefined();

    const cloudOnly = onboardingFlowsFor({ cloudCost: true, sapMonitoring: false }).map((f) => f.key);
    expect(cloudOnly).not.toContain('connect-sap');
    expect(cloudOnly).toContain('connect-azure');
    const sapOnly = onboardingFlowsFor({ cloudCost: false, sapMonitoring: true }).map((f) => f.key);
    expect(sapOnly).toEqual(['connect-sap', 'add-alert-recipients', 'invite-teammate']);
  });

  it('uses the stable selectors of the shared connect dialog', () => {
    const azure = onboardingFlowByKey('connect-azure')!;
    const targets = azure.steps.map((s) => s.target);
    expect(targets).toContain('css:[data-tour="connect-dialog"]');
    expect(targets).toContain('css:[data-tour="connect-provider-azure"]');
    expect(targets).toContain('css:[data-tour="use-sample-credentials"]');
    expect(targets).toContain('css:[data-tour="connect-submit"]');
    expect(onboardingFlowByKey('connect-sap')!.steps.map((s) => s.target)).toContain('css:[data-tour="connect-provider-sap"]');
    expect(azure.steps[0].enter).toEqual({ openConnect: 'azure' });
    expect(azure.steps[1].optional).toBe(true);
  });
});
