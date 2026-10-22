/* Public API of the setup feature: the guided first-time setup wizard (/setup) and the once-only first sign-in redirect to it. */
export { SetupPage } from './pages/SetupPage';
export { SetupRedirect } from './components/SetupRedirect';
export { useCanRunSetup } from './model/useSetup';
export { deriveSetup } from './model/setupSteps';
export type { SetupModel, SetupStep, SetupStepId } from './model/setupSteps';
