# CCM Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Mavera-styled Cloud Cost Monitoring app's foundation — theme/tokens, shared shell, auth flow, and home dashboard — as a working, tested Vite + React 19 + TypeScript + Ant Design 6 project.

**Architecture:** A single-package Vite SPA. All visual state routes through a typed token layer (`src/theme`) consumed by an AntD `ConfigProvider`; no Tailwind. Auth and API interceptor behavior are ported 1:1 from the reference app (`C:\Users\vishw\Downloads\public`) into typed equivalents. Shared shell chrome (nav, modals, toasts, empty/error primitives) is built once here so later phases (cloud provider modules, shared feature pages) consume it rather than re-inventing per page.

**Tech Stack:** React 19, TypeScript, Vite, React Router 7, Ant Design 6.x, axios, Recharts, Vitest + React Testing Library + axios-mock-adapter.

**Spec:** `docs/superpowers/specs/2026-09-26-ccm-foundation-design.md`

## Global Constraints

- No Tailwind anywhere; every style decision routes through `src/theme` tokens and AntD's `ConfigProvider theme`.
- TypeScript throughout; npm as the package manager.
- Dark mode is built from the design doc's explicit dark color values, never produced by algorithmically inverting light.
- `@font-face` rules are wired per the doc's contract, but no WOFF2 files are added in this phase — the system fallback stack renders until real files are sourced.
- Compact header renders the live-text "MAVERA" wordmark; `mavera.png` (the full stacked lockup) is only used uncropped on auth pages.
- No "SAP Monitoring" / "IDoc Monitoring" placeholder nav items — navigation mirrors the reference app's real IA (Dashboard, Cloud Costs▾, Optimisation▾, Operations▾, Governance, Account, Administration▾).
- Nav/route gating uses the reference app's real fields (`user.canViewAzure/Aws/Btp/Gcp`, `user.role`), not a speculative subscription/entitlement model.
- The `ccm:toast` `window` custom event contract is preserved unchanged (axios interceptors run outside the React tree and need it); only the renderer changes to AntD `message`/`notification`.
- `useConfirm()`'s promise-based call signature is preserved unchanged from the reference app.
- No backend changes of any kind — this phase is frontend-only against the existing, unmodified API shape described in the spec.
- Phases 2–6 (cloud provider pages, shared feature pages, admin portal, AI chat widget) are explicitly out of scope for this plan.

## Review Focus

- Concurrent requests that all receive a 401 `TokenExpired` at once must coalesce into exactly one `/auth/refresh-token` call, not one per request — owned by Task 7.
- A corrupted or unrecognized `localStorage` value for `mavera.theme`/`mavera.density` must fall back to the documented default (`light`/`comfortable`), never throw — owned by Task 3.
- A network error (no `error.response`) is retried with backoff up to 3 times, but never for `/auth/*` routes (to avoid retry loops around login/refresh) — owned by Task 7.
- Two concurrent requests that both receive a 403 `subscriptionExpired` must not trigger two redirects/navigations — owned by Task 7.
- A `user` object missing optional fields (`accountLimits`, `features`, any `canView*` flag) must not crash permission derivation or throw while rendering the nav — owned by Task 9 and Task 10.

---

## Task 1: Project scaffold and tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `.gitignore`
- Create: `src/main.tsx`
- Create: `src/vite-env.d.ts`
- Create: `src/App.tsx`
- Create: `src/test/setup.ts`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: `App` (default export, `src/App.tsx`) — a React component later tasks replace the body of, but the module path and default export stay fixed for all later tasks.
- Produces: Vitest environment (`jsdom`) and `@testing-library/jest-dom` matchers globally available to every later test file via `src/test/setup.ts`.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "mavera-ccm",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@ant-design/icons": "^6.0.0",
    "antd": "^6.0.0",
    "axios": "^1.13.2",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^7.13.0",
    "recharts": "^3.6.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^19.2.5",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "axios-mock-adapter": "^2.1.0",
    "jsdom": "^25.0.1",
    "typescript": "^5.7.2",
    "vite": "^7.2.4",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Write `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Write `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
```

- [ ] **Step 5: Write `index.html`**

The inline script resolves the persisted theme/density before React mounts, so there is no flash of the wrong theme. It intentionally duplicates the trivial fallback logic from `src/theme/resolveInitialTheme.ts` (Task 3) in plain JS, because it must run before any bundled module executes.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mavera — Cloud Cost Monitoring</title>
    <script>
      (function () {
        try {
          var mode = localStorage.getItem('mavera.theme');
          var density = localStorage.getItem('mavera.density');
          document.documentElement.setAttribute(
            'data-theme',
            mode === 'dark' ? 'dark' : 'light',
          );
          document.documentElement.setAttribute(
            'data-density',
            density === 'compact' ? 'compact' : 'comfortable',
          );
        } catch (e) {
          document.documentElement.setAttribute('data-theme', 'light');
          document.documentElement.setAttribute('data-density', 'comfortable');
        }
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Write `.gitignore`**

```
node_modules
dist
*.local
.DS_Store
```

- [ ] **Step 7: Write `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 8: Write `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 9: Write the failing test `src/App.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the Mavera app root', () => {
    render(<App />);
    expect(screen.getByText('Mavera')).toBeInTheDocument();
  });
});
```

- [ ] **Step 10: Install dependencies**

Run: `npm install`

- [ ] **Step 11: Run the test to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — `Failed to resolve import "./App"` (file doesn't exist yet)

- [ ] **Step 12: Write minimal `src/App.tsx`**

```tsx
function App() {
  return <div>Mavera</div>;
}

export default App;
```

- [ ] **Step 13: Write `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 14: Run the test to verify it passes**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS

- [ ] **Step 15: Commit**

```bash
git add package.json tsconfig.json tsconfig.node.json vite.config.ts index.html .gitignore src/
git commit -m "chore: scaffold Vite + React 19 + TypeScript project with Vitest"
```

---

## Task 2: Design tokens

**Files:**
- Create: `src/theme/tokens.ts`
- Test: `src/theme/tokens.test.ts`

**Interfaces:**
- Produces: `ColorTokens` type, `lightColors`, `darkColors`, `spacing`, `radius`, `shadow`, `motion`, `chartColors` — all consumed by Task 3's `themeConfig.ts` and by every later visual task.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { lightColors, darkColors, spacing, radius, shadow, motion, chartColors } from './tokens';

describe('design tokens', () => {
  it('light and dark color tokens declare the same set of roles', () => {
    expect(Object.keys(lightColors).sort()).toEqual(Object.keys(darkColors).sort());
  });

  it('matches key color values from MAVERA_DESIGN_SYSTEM.md §4.1', () => {
    expect(lightColors.canvas).toBe('#F6F7F9');
    expect(lightColors.primary).toBe('#175CD3');
    expect(darkColors.primary).toBe('#84ADFF');
    expect(darkColors.action).toBe('#175CD3');
  });

  it('spacing scale has no arbitrary values outside the documented steps', () => {
    expect(spacing.space4).toBe(16);
    expect(spacing.space6).toBe(24);
  });

  it('radius and shadow tokens are defined for both themes', () => {
    expect(radius.lg).toBe(8);
    expect(shadow.light).toContain('rgba(16,24,40');
    expect(shadow.dark).toContain('rgba(0,0,0');
  });

  it('motion tokens match documented durations', () => {
    expect(motion.fast).toBe(120);
    expect(motion.base).toBe(160);
    expect(motion.slow).toBe(200);
  });

  it('chart color roles are defined for both themes', () => {
    expect(chartColors.light.primary).toBe('#175CD3');
    expect(chartColors.dark.primary).toBe('#84ADFF');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/theme/tokens.test.ts`
Expected: FAIL — `Failed to resolve import "./tokens"`

- [ ] **Step 3: Write `src/theme/tokens.ts`**

```ts
export interface ColorTokens {
  canvas: string;
  surface: string;
  surfaceSubtle: string;
  surfaceHover: string;
  surfacePressed: string;
  elevated: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  border: string;
  borderControl: string;
  divider: string;
  primary: string;
  primaryHover: string;
  primaryActive: string;
  action: string;
  actionHover: string;
  actionActive: string;
  onAction: string;
  onPrimary: string;
  selected: string;
  focus: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  scrim: string;
}

export const lightColors: ColorTokens = {
  canvas: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F3F5',
  surfaceHover: '#E9EDF2',
  surfacePressed: '#DFE5EC',
  elevated: '#FFFFFF',
  text: '#182230',
  textSecondary: '#475467',
  textMuted: '#596579',
  textDisabled: '#7C8798',
  border: '#D6DCE5',
  borderControl: '#7C8798',
  divider: '#E7EBF0',
  primary: '#175CD3',
  primaryHover: '#1849A9',
  primaryActive: '#194185',
  action: '#175CD3',
  actionHover: '#1849A9',
  actionActive: '#194185',
  onAction: '#FFFFFF',
  onPrimary: '#FFFFFF',
  selected: '#EAF2FF',
  focus: '#175CD3',
  success: '#056B40',
  warning: '#8A4B08',
  danger: '#B42318',
  info: '#175CD3',
  scrim: 'rgba(16,24,40,.40)',
};

export const darkColors: ColorTokens = {
  canvas: '#111318',
  surface: '#191D24',
  surfaceSubtle: '#222832',
  surfaceHover: '#2B3340',
  surfacePressed: '#354052',
  elevated: '#242B36',
  text: '#F2F4F7',
  textSecondary: '#C0C8D4',
  textMuted: '#A4B0C2',
  textDisabled: '#778397',
  border: '#3D4756',
  borderControl: '#778397',
  divider: '#303846',
  primary: '#84ADFF',
  primaryHover: '#A4C2FF',
  primaryActive: '#C7D7FE',
  action: '#175CD3',
  actionHover: '#1849A9',
  actionActive: '#194185',
  onAction: '#FFFFFF',
  onPrimary: '#111318',
  selected: '#223B60',
  focus: '#84ADFF',
  success: '#75E0A7',
  warning: '#FEC84B',
  danger: '#FDA29B',
  info: '#84ADFF',
  scrim: 'rgba(0,0,0,.64)',
};

export const spacing = {
  space0: 0,
  space1: 4,
  space2: 8,
  space3: 12,
  space4: 16,
  space5: 20,
  space6: 24,
  space8: 32,
  space10: 40,
  space12: 48,
  space16: 64,
} as const;

export const radius = {
  sm: 4,
  md: 6,
  lg: 8,
} as const;

export const shadow = {
  light: '0 8px 24px rgba(16,24,40,.12), 0 2px 6px rgba(16,24,40,.06)',
  dark: '0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.24)',
} as const;

export const motion = {
  fast: 120,
  base: 160,
  slow: 200,
  exit: 120,
  easeStandard: 'cubic-bezier(0.2, 0, 0, 1)',
} as const;

interface ChartColorRoles {
  primary: string;
  secondary: string;
  tertiary: string;
  grid: string;
  axis: string;
}

export const chartColors: { light: ChartColorRoles; dark: ChartColorRoles } = {
  light: {
    primary: '#175CD3',
    secondary: '#475467',
    tertiary: '#527AA3',
    grid: '#E7EBF0',
    axis: '#596579',
  },
  dark: {
    primary: '#84ADFF',
    secondary: '#D0D5DD',
    tertiary: '#74B9C7',
    grid: '#303846',
    axis: '#A4B0C2',
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/theme/tokens.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/theme/tokens.ts src/theme/tokens.test.ts
git commit -m "feat: add Mavera design tokens (color, spacing, radius, shadow, motion, chart)"
```

---

## Task 3: Theme config, ThemeProvider, and fonts

**Files:**
- Create: `src/theme/resolveInitialTheme.ts`
- Test: `src/theme/resolveInitialTheme.test.ts`
- Create: `src/theme/themeConfig.ts`
- Test: `src/theme/themeConfig.test.ts`
- Create: `src/theme/ThemeProvider.tsx`
- Test: `src/theme/ThemeProvider.test.tsx`
- Create: `src/theme/fonts.css`
- Modify: `src/main.tsx` (import `./theme/fonts.css`)
- Modify: `src/App.tsx` (wrap content in `ThemeProvider`)

**Interfaces:**
- Consumes: `lightColors`, `darkColors`, `radius`, `chartColors` from Task 2's `src/theme/tokens.ts`.
- Produces: `ThemeMode`, `Density` types; `THEME_STORAGE_KEY`, `DENSITY_STORAGE_KEY` constants; `resolveStoredMode`, `resolveStoredDensity` (`src/theme/resolveInitialTheme.ts`) — consumed by `ThemeProvider` and by Task 11's `ProfileMenu` toggle. `buildThemeConfig(mode, density)` (`src/theme/themeConfig.ts`). `ThemeProvider`, `useMaveraTheme()` returning `{ mode, density, setMode, setDensity, toggleMode }` (`src/theme/ThemeProvider.tsx`) — consumed by every later task that reads or changes theme/density, and by `App.tsx`'s root wrapping (all later tasks' top-level providers nest inside this one).

- [ ] **Step 1: Write the failing test for `resolveInitialTheme.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { resolveStoredMode, resolveStoredDensity } from './resolveInitialTheme';

describe('resolveInitialTheme', () => {
  it('resolves "dark" to dark and everything else to light', () => {
    expect(resolveStoredMode('dark')).toBe('dark');
    expect(resolveStoredMode('light')).toBe('light');
    expect(resolveStoredMode('blue')).toBe('light');
    expect(resolveStoredMode(null)).toBe('light');
  });

  it('resolves "compact" to compact and everything else to comfortable', () => {
    expect(resolveStoredDensity('compact')).toBe('compact');
    expect(resolveStoredDensity('roomy')).toBe('comfortable');
    expect(resolveStoredDensity(null)).toBe('comfortable');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/theme/resolveInitialTheme.test.ts`
Expected: FAIL — `Failed to resolve import "./resolveInitialTheme"`

- [ ] **Step 3: Write `src/theme/resolveInitialTheme.ts`**

```ts
export type ThemeMode = 'light' | 'dark';
export type Density = 'comfortable' | 'compact';

export const THEME_STORAGE_KEY = 'mavera.theme';
export const DENSITY_STORAGE_KEY = 'mavera.density';

export function resolveStoredMode(raw: string | null): ThemeMode {
  return raw === 'dark' ? 'dark' : 'light';
}

export function resolveStoredDensity(raw: string | null): Density {
  return raw === 'compact' ? 'compact' : 'comfortable';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/theme/resolveInitialTheme.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing test for `themeConfig.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { theme as antdTheme } from 'antd';
import { buildThemeConfig } from './themeConfig';
import { lightColors, darkColors } from './tokens';

describe('buildThemeConfig', () => {
  it('maps light tokens onto AntD seed tokens', () => {
    const config = buildThemeConfig('light', 'comfortable');
    expect(config.token?.colorPrimary).toBe(lightColors.primary);
    expect(config.token?.colorBgLayout).toBe(lightColors.canvas);
  });

  it('maps dark tokens explicitly rather than relying on algorithmic inversion', () => {
    const config = buildThemeConfig('dark', 'comfortable');
    expect(config.token?.colorPrimary).toBe(darkColors.primary);
    expect(config.token?.colorBgLayout).toBe(darkColors.canvas);
  });

  it('uses the dark algorithm only in dark mode', () => {
    const light = buildThemeConfig('light', 'comfortable');
    const dark = buildThemeConfig('dark', 'comfortable');
    expect(light.algorithm).toContain(antdTheme.defaultAlgorithm);
    expect(dark.algorithm).toContain(antdTheme.darkAlgorithm);
  });

  it('adds the compact algorithm only when density is compact', () => {
    const comfortable = buildThemeConfig('light', 'comfortable');
    const compact = buildThemeConfig('light', 'compact');
    expect(comfortable.algorithm).not.toContain(antdTheme.compactAlgorithm);
    expect(compact.algorithm).toContain(antdTheme.compactAlgorithm);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/theme/themeConfig.test.ts`
Expected: FAIL — `Failed to resolve import "./themeConfig"`

- [ ] **Step 7: Write `src/theme/themeConfig.ts`**

```ts
import { theme as antdTheme, type ThemeConfig } from 'antd';
import { lightColors, darkColors, radius } from './tokens';
import type { ThemeMode, Density } from './resolveInitialTheme';

export function buildThemeConfig(mode: ThemeMode, density: Density = 'comfortable'): ThemeConfig {
  const colors = mode === 'dark' ? darkColors : lightColors;
  const baseAlgorithm = mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm;
  const algorithm = density === 'compact' ? [baseAlgorithm, antdTheme.compactAlgorithm] : [baseAlgorithm];

  return {
    algorithm,
    token: {
      colorPrimary: colors.primary,
      colorLink: colors.primary,
      colorBgBase: colors.canvas,
      colorBgLayout: colors.canvas,
      colorBgContainer: colors.surface,
      colorBgElevated: colors.elevated,
      colorText: colors.text,
      colorTextSecondary: colors.textSecondary,
      colorTextTertiary: colors.textMuted,
      colorTextDisabled: colors.textDisabled,
      colorBorder: colors.border,
      colorBorderSecondary: colors.divider,
      colorSuccess: colors.success,
      colorWarning: colors.warning,
      colorError: colors.danger,
      colorInfo: colors.info,
      borderRadius: radius.md,
      borderRadiusLG: radius.lg,
      borderRadiusSM: radius.sm,
      fontFamily: 'var(--mv-font-body)',
    },
  };
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/theme/themeConfig.test.ts`
Expected: PASS

- [ ] **Step 9: Write the failing test for `ThemeProvider.tsx`**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useMaveraTheme } from './ThemeProvider';
import { THEME_STORAGE_KEY, DENSITY_STORAGE_KEY } from './resolveInitialTheme';

function Consumer() {
  const { mode, density, setMode, toggleMode, setDensity } = useMaveraTheme();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="density">{density}</span>
      <button onClick={() => setMode('dark')}>set dark</button>
      <button onClick={toggleMode}>toggle</button>
      <button onClick={() => setDensity('compact')}>set compact</button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to light mode and comfortable density when storage is empty', () => {
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    expect(screen.getByTestId('density')).toHaveTextContent('comfortable');
  });

  it('falls back to defaults when storage holds an unrecognized value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'blue');
    localStorage.setItem(DENSITY_STORAGE_KEY, 'roomy');
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    expect(screen.getByTestId('density')).toHaveTextContent('comfortable');
  });

  it('persists an explicit mode change to localStorage and updates context', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    await user.click(screen.getByText('set dark'));
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('toggleMode flips between light and dark', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    await user.click(screen.getByText('toggle'));
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    await user.click(screen.getByText('toggle'));
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
  });

  it('persists density independently of mode', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    await user.click(screen.getByText('set compact'));
    expect(screen.getByTestId('density')).toHaveTextContent('compact');
    expect(localStorage.getItem(DENSITY_STORAGE_KEY)).toBe('compact');
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npx vitest run src/theme/ThemeProvider.test.tsx`
Expected: FAIL — `Failed to resolve import "./ThemeProvider"`

- [ ] **Step 11: Write `src/theme/ThemeProvider.tsx`**

```tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ConfigProvider } from 'antd';
import { buildThemeConfig } from './themeConfig';
import {
  THEME_STORAGE_KEY,
  DENSITY_STORAGE_KEY,
  resolveStoredMode,
  resolveStoredDensity,
  type ThemeMode,
  type Density,
} from './resolveInitialTheme';
import { lightColors, darkColors } from './tokens';

interface MaveraThemeContextValue {
  mode: ThemeMode;
  density: Density;
  setMode: (mode: ThemeMode) => void;
  setDensity: (density: Density) => void;
  toggleMode: () => void;
}

const MaveraThemeContext = createContext<MaveraThemeContextValue | undefined>(undefined);

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable (private browsing, quota) — in-memory state still works
  }
}

function applyCssVariables(mode: ThemeMode) {
  const colors = mode === 'dark' ? darkColors : lightColors;
  const root = document.documentElement;
  Object.entries(colors).forEach(([key, value]) => {
    const cssKey = `--mv-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssKey, value);
  });
  root.setAttribute('data-theme', mode);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => resolveStoredMode(readStorage(THEME_STORAGE_KEY)));
  const [density, setDensityState] = useState<Density>(() =>
    resolveStoredDensity(readStorage(DENSITY_STORAGE_KEY)),
  );

  useEffect(() => {
    applyCssVariables(mode);
  }, [mode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
  }, [density]);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    writeStorage(THEME_STORAGE_KEY, next);
  };

  const setDensity = (next: Density) => {
    setDensityState(next);
    writeStorage(DENSITY_STORAGE_KEY, next);
  };

  const toggleMode = () => setMode(mode === 'dark' ? 'light' : 'dark');

  const themeConfig = useMemo(() => buildThemeConfig(mode, density), [mode, density]);

  const value = useMemo<MaveraThemeContextValue>(
    () => ({ mode, density, setMode, setDensity, toggleMode }),
    [mode, density],
  );

  return (
    <MaveraThemeContext.Provider value={value}>
      <ConfigProvider theme={themeConfig}>{children}</ConfigProvider>
    </MaveraThemeContext.Provider>
  );
}

export function useMaveraTheme(): MaveraThemeContextValue {
  const ctx = useContext(MaveraThemeContext);
  if (!ctx) throw new Error('useMaveraTheme must be used within a ThemeProvider');
  return ctx;
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npx vitest run src/theme/ThemeProvider.test.tsx`
Expected: PASS

- [ ] **Step 13: Write `src/theme/fonts.css`**

```css
/* Real WOFF2 files are not yet present in this repo (spec §3/§10 tracked
   gap). These @font-face rules are wired per MAVERA_DESIGN_SYSTEM.md §3.2;
   until the actual files are added at the paths below, each failed source
   silently falls back to the next family in its --mv-font-* stack — text
   never disappears and no action becomes unavailable. */
@font-face {
  font-family: 'Google Sans Text';
  src: url('/fonts/google-sans-text-400.woff2') format('woff2');
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: 'Google Sans Text';
  src: url('/fonts/google-sans-text-500.woff2') format('woff2');
  font-style: normal;
  font-weight: 500;
  font-display: swap;
}
@font-face {
  font-family: 'Google Sans Text';
  src: url('/fonts/google-sans-text-600.woff2') format('woff2');
  font-style: normal;
  font-weight: 600;
  font-display: swap;
}
@font-face {
  font-family: 'Poppins';
  src: url('/fonts/poppins-500.woff2') format('woff2');
  font-style: normal;
  font-weight: 500;
  font-display: swap;
}
@font-face {
  font-family: 'Poppins';
  src: url('/fonts/poppins-600.woff2') format('woff2');
  font-style: normal;
  font-weight: 600;
  font-display: swap;
}

:root {
  --mv-font-body: 'Google Sans Text', 'Segoe UI', Arial, sans-serif;
  --mv-font-heading: 'Poppins', 'Segoe UI', Arial, sans-serif;
  --mv-font-mono: ui-monospace, SFMono-Regular, Consolas, monospace;
}

body {
  font-family: var(--mv-font-body);
  font-size: 14px;
  line-height: 22px;
  margin: 0;
  background: var(--mv-canvas);
  color: var(--mv-text);
}

.mv-heading {
  font-family: var(--mv-font-heading);
  font-weight: 600;
}

.mv-number {
  font-variant-numeric: tabular-nums lining-nums;
}

.mv-code {
  font-family: var(--mv-font-mono);
  font-size: 13px;
  line-height: 20px;
}
```

- [ ] **Step 14: Wire the provider and stylesheet into the app**

Modify `src/main.tsx` — add the fonts import as the first import:

```tsx
import './theme/fonts.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Modify `src/App.tsx`:

```tsx
import { ThemeProvider } from './theme/ThemeProvider';

function App() {
  return (
    <ThemeProvider>
      <div>Mavera</div>
    </ThemeProvider>
  );
}

export default App;
```

- [ ] **Step 15: Run the full test suite to confirm nothing regressed**

Run: `npx vitest run`
Expected: PASS (all tests from Tasks 1–3)

- [ ] **Step 16: Commit**

```bash
git add src/theme/ src/main.tsx src/App.tsx
git commit -m "feat: add ThemeProvider with light/dark + density, wired into ConfigProvider"
```

---

## Task 4: Toast event contract and listener

**Files:**
- Create: `src/lib/toastEvents.ts`
- Test: `src/lib/toastEvents.test.ts`
- Create: `src/components/ToastListener.tsx`
- Test: `src/components/ToastListener.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `ToastType`, `ToastDetail`, `CCM_TOAST_EVENT`, `fireToast(detail)`, `subscribeToToasts(callback): () => void` (`src/lib/toastEvents.ts`) — Task 7's `api/index.ts` imports `fireToast` from here to raise UI feedback from outside the React tree.
- Produces: `ToastListener` component (`src/components/ToastListener.tsx`) — mounted once, inside AntD's `App` provider, in `App.tsx`.

- [ ] **Step 1: Write the failing test for `toastEvents.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { fireToast, subscribeToToasts, CCM_TOAST_EVENT } from './toastEvents';

describe('toastEvents', () => {
  it('fireToast dispatches a window CustomEvent with the given detail', () => {
    const handler = vi.fn();
    window.addEventListener(CCM_TOAST_EVENT, handler as EventListener);
    fireToast({ type: 'error', message: 'Something broke' });
    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ type: 'error', message: 'Something broke' });
    window.removeEventListener(CCM_TOAST_EVENT, handler as EventListener);
  });

  it('subscribeToToasts invokes the callback for dispatched toasts and unsubscribes cleanly', () => {
    const callback = vi.fn();
    const unsubscribe = subscribeToToasts(callback);
    fireToast({ type: 'success', message: 'Saved' });
    expect(callback).toHaveBeenCalledWith({ type: 'success', message: 'Saved' });
    unsubscribe();
    fireToast({ type: 'success', message: 'Saved again' });
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/toastEvents.test.ts`
Expected: FAIL — `Failed to resolve import "./toastEvents"`

- [ ] **Step 3: Write `src/lib/toastEvents.ts`**

```ts
export type ToastType = 'error' | 'warning' | 'success' | 'info';

export interface ToastDetail {
  type: ToastType;
  message: string;
}

export const CCM_TOAST_EVENT = 'ccm:toast';

export function fireToast(detail: ToastDetail): void {
  window.dispatchEvent(new CustomEvent<ToastDetail>(CCM_TOAST_EVENT, { detail }));
}

export function subscribeToToasts(callback: (detail: ToastDetail) => void): () => void {
  const handler = (event: Event) => {
    callback((event as CustomEvent<ToastDetail>).detail);
  };
  window.addEventListener(CCM_TOAST_EVENT, handler);
  return () => window.removeEventListener(CCM_TOAST_EVENT, handler);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/toastEvents.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing test for `ToastListener.tsx`**

The AntD `App.useApp()` hook returns a contextual `message`/`notification` instance tied to the tree it's called in, separate from the static `message` export — spying on the static export would not observe it. The test instead mocks `App.useApp` directly, which lets `ToastListener` render standalone without a real `<AntdApp>` wrapper.

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ToastListener } from './ToastListener';
import { fireToast } from '../lib/toastEvents';

const errorMock = vi.fn();
const warningMock = vi.fn();
const successMock = vi.fn();
const infoMock = vi.fn();

vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>();
  return {
    ...actual,
    App: {
      ...actual.App,
      useApp: () => ({
        message: { error: errorMock, warning: warningMock, success: successMock, info: infoMock },
        notification: {},
        modal: {},
      }),
    },
  };
});

describe('ToastListener', () => {
  beforeEach(() => {
    errorMock.mockClear();
    warningMock.mockClear();
    successMock.mockClear();
    infoMock.mockClear();
  });

  it('calls message.error for an error toast', () => {
    render(<ToastListener />);
    fireToast({ type: 'error', message: 'Request failed' });
    expect(errorMock).toHaveBeenCalledWith('Request failed');
  });

  it('calls message.success for a success toast', () => {
    render(<ToastListener />);
    fireToast({ type: 'success', message: 'Saved' });
    expect(successMock).toHaveBeenCalledWith('Saved');
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/components/ToastListener.test.tsx`
Expected: FAIL — `Failed to resolve import "./ToastListener"`

- [ ] **Step 7: Write `src/components/ToastListener.tsx`**

```tsx
import { useEffect } from 'react';
import { App as AntdApp } from 'antd';
import { subscribeToToasts } from '../lib/toastEvents';

export function ToastListener() {
  const { message } = AntdApp.useApp();

  useEffect(() => {
    return subscribeToToasts((detail) => {
      void message[detail.type](detail.message);
    });
  }, [message]);

  return null;
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/components/ToastListener.test.tsx`
Expected: PASS

- [ ] **Step 9: Wire `ToastListener` into the app, inside AntD's `App` provider**

Modify `src/App.tsx`:

```tsx
import { App as AntdApp } from 'antd';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastListener } from './components/ToastListener';

function App() {
  return (
    <ThemeProvider>
      <AntdApp>
        <ToastListener />
        <div>Mavera</div>
      </AntdApp>
    </ThemeProvider>
  );
}

export default App;
```

- [ ] **Step 10: Run the full test suite to confirm nothing regressed**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add src/lib/toastEvents.ts src/lib/toastEvents.test.ts src/components/ToastListener.tsx src/components/ToastListener.test.tsx src/App.tsx
git commit -m "feat: add ccm:toast event contract and AntD-backed ToastListener"
```

---

## Task 5: Shared state primitives — EmptyState, DataFreshness, StatusTag

**Files:**
- Create: `src/components/EmptyState.tsx`
- Test: `src/components/EmptyState.test.tsx`
- Create: `src/components/DataFreshness.tsx`
- Test: `src/components/DataFreshness.test.tsx`
- Create: `src/components/StatusTag.tsx`
- Test: `src/components/StatusTag.test.tsx`

**Interfaces:**
- Consumes: `useMaveraTheme` and `lightColors`/`darkColors` from Task 3.
- Produces: `EmptyState`, `DataFreshness`, `StatusTag` (+ `StatusTone` type) — these are the shared primitives later phases' data tables/pages build on; not consumed by any task in this plan beyond this one, since no real data table ships until phase 2.

- [ ] **Step 1: Write the failing tests for `EmptyState.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders heading and explanation, and hides the action when none is given', () => {
    render(
      <EmptyState
        icon={<span>icon</span>}
        heading="No dumps in this period"
        explanation="Try a wider date range."
      />,
    );
    expect(screen.getByText('No dumps in this period')).toBeInTheDocument();
    expect(screen.getByText('Try a wider date range.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders and fires the action when provided', async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(
      <EmptyState
        icon={<span>icon</span>}
        heading="No integrations"
        explanation="Connect a cloud account to get started."
        actionLabel="Add system"
        onAction={onAction}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Add system' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/EmptyState.test.tsx`
Expected: FAIL — `Failed to resolve import "./EmptyState"`

- [ ] **Step 3: Write `src/components/EmptyState.tsx`**

```tsx
import type { ReactNode } from 'react';
import { Button, Typography } from 'antd';

export interface EmptyStateProps {
  icon: ReactNode;
  heading: string;
  explanation: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, heading, explanation, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div role="status" style={{ textAlign: 'center', padding: 32 }}>
      <div aria-hidden="true" style={{ fontSize: 24, marginBottom: 16 }}>
        {icon}
      </div>
      <Typography.Title level={5} style={{ marginBottom: 8 }}>
        {heading}
      </Typography.Title>
      <Typography.Paragraph type="secondary">{explanation}</Typography.Paragraph>
      {actionLabel && onAction && (
        <Button type="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/EmptyState.test.tsx`
Expected: PASS

- [ ] **Step 5: Write the failing tests for `DataFreshness.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataFreshness } from './DataFreshness';

describe('DataFreshness', () => {
  it('shows "Update time unavailable" when there is no timestamp', () => {
    render(<DataFreshness lastUpdated={null} />);
    expect(screen.getByText('Update time unavailable')).toBeInTheDocument();
  });

  it('shows a relative age for a recent timestamp', () => {
    const now = new Date('2026-09-26T12:00:00Z');
    const lastUpdated = new Date('2026-09-26T11:55:00Z');
    render(<DataFreshness lastUpdated={lastUpdated} now={now} />);
    expect(screen.getByText(/5 minutes ago/)).toBeInTheDocument();
  });

  it('marks data stale once it exceeds the configured threshold', () => {
    const now = new Date('2026-09-26T12:00:00Z');
    const lastUpdated = new Date('2026-09-26T10:00:00Z');
    render(<DataFreshness lastUpdated={lastUpdated} now={now} staleAfterMinutes={30} />);
    expect(screen.getByText(/^Stale/)).toBeInTheDocument();
  });

  it('does not mark data stale within the configured threshold', () => {
    const now = new Date('2026-09-26T12:00:00Z');
    const lastUpdated = new Date('2026-09-26T11:50:00Z');
    render(<DataFreshness lastUpdated={lastUpdated} now={now} staleAfterMinutes={30} />);
    expect(screen.queryByText(/^Stale/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/components/DataFreshness.test.tsx`
Expected: FAIL — `Failed to resolve import "./DataFreshness"`

- [ ] **Step 7: Write `src/components/DataFreshness.tsx`**

```tsx
import { Typography } from 'antd';

export interface DataFreshnessProps {
  lastUpdated: Date | null;
  staleAfterMinutes?: number;
  now?: Date;
}

function formatRelative(diffMs: number): string {
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function DataFreshness({ lastUpdated, staleAfterMinutes, now = new Date() }: DataFreshnessProps) {
  if (!lastUpdated) {
    return <Typography.Text type="secondary">Update time unavailable</Typography.Text>;
  }

  const diffMs = now.getTime() - lastUpdated.getTime();
  const isStale = staleAfterMinutes !== undefined && diffMs / 60000 > staleAfterMinutes;
  const timezoneLabel = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const absolute = `${lastUpdated.toLocaleString()} (${timezoneLabel})`;

  return (
    <Typography.Text type={isStale ? 'warning' : 'secondary'}>
      {isStale ? 'Stale — ' : ''}
      Last updated {formatRelative(diffMs)} · {absolute}
    </Typography.Text>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/components/DataFreshness.test.tsx`
Expected: PASS

- [ ] **Step 9: Write the failing tests for `StatusTag.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../theme/ThemeProvider';
import { StatusTag } from './StatusTag';
import { lightColors } from '../theme/tokens';

describe('StatusTag', () => {
  it('renders its label text', () => {
    render(
      <ThemeProvider>
        <StatusTag tone="success">Subscribed</StatusTag>
      </ThemeProvider>,
    );
    expect(screen.getByText('Subscribed')).toBeInTheDocument();
  });

  it('applies the semantic color to text, not as a solid fill', () => {
    render(
      <ThemeProvider>
        <StatusTag tone="danger">Critical</StatusTag>
      </ThemeProvider>,
    );
    const tag = screen.getByText('Critical').closest('.ant-tag') as HTMLElement;
    expect(tag.style.color).toBe(lightColors.danger);
    expect(tag.style.background).toBe(lightColors.surfaceSubtle);
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npx vitest run src/components/StatusTag.test.tsx`
Expected: FAIL — `Failed to resolve import "./StatusTag"`

- [ ] **Step 11: Write `src/components/StatusTag.tsx`**

```tsx
import type { ReactNode } from 'react';
import { Tag } from 'antd';
import { lightColors, darkColors } from '../theme/tokens';
import { useMaveraTheme } from '../theme/ThemeProvider';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusTagProps {
  tone: StatusTone;
  children: ReactNode;
}

export function StatusTag({ tone, children }: StatusTagProps) {
  const { mode } = useMaveraTheme();
  const colors = mode === 'dark' ? darkColors : lightColors;
  const textColor = tone === 'neutral' ? colors.textSecondary : colors[tone];

  return (
    <Tag
      bordered
      style={{
        color: textColor,
        borderColor: colors.border,
        background: colors.surfaceSubtle,
      }}
    >
      {children}
    </Tag>
  );
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npx vitest run src/components/StatusTag.test.tsx`
Expected: PASS

- [ ] **Step 13: Run the full test suite to confirm nothing regressed**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 14: Commit**

```bash
git add src/components/EmptyState.tsx src/components/EmptyState.test.tsx src/components/DataFreshness.tsx src/components/DataFreshness.test.tsx src/components/StatusTag.tsx src/components/StatusTag.test.tsx
git commit -m "feat: add EmptyState, DataFreshness, and StatusTag shared primitives"
```

---

## Task 6: Confirm/Modal wrapper (`useConfirm`)

**Files:**
- Create: `src/components/ConfirmProvider.tsx`
- Test: `src/components/ConfirmProvider.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `ConfirmVariant`, `ConfirmOptions`, `ConfirmProvider`, `useConfirm(): (options: ConfirmOptions) => Promise<boolean>` — this promise-based signature is the one later phases' delete/logout/destructive-action flows call; it must not change shape once phase 2+ starts depending on it.

- [ ] **Step 1: Write the failing test**

`App.useApp()` returns a contextual `modal` instance separate from the static `Modal.confirm` export, so the test mocks `App.useApp` directly (same approach as Task 4's `ToastListener` test) rather than rendering inside a real `<AntdApp>`.

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider, useConfirm } from './ConfirmProvider';

const confirmMock = vi.fn();

vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>();
  return {
    ...actual,
    App: {
      ...actual.App,
      useApp: () => ({
        message: {},
        notification: {},
        modal: { confirm: confirmMock },
      }),
    },
  };
});

function Harness() {
  const confirm = useConfirm();
  const [result, setResult] = useState('pending');

  return (
    <button
      onClick={async () => {
        const ok = await confirm({ title: 'Remove saved view', variant: 'delete' });
        setResult(ok ? 'confirmed' : 'cancelled');
      }}
    >
      go: {result}
    </button>
  );
}

describe('ConfirmProvider', () => {
  beforeEach(() => {
    confirmMock.mockReset();
  });

  it('resolves true when the modal calls onOk', async () => {
    confirmMock.mockImplementation((opts: any) => opts.onOk());
    const user = userEvent.setup();
    render(
      <ConfirmProvider>
        <Harness />
      </ConfirmProvider>,
    );
    await user.click(screen.getByRole('button'));
    expect(await screen.findByText('go: confirmed')).toBeInTheDocument();
  });

  it('resolves false when the modal calls onCancel', async () => {
    confirmMock.mockImplementation((opts: any) => opts.onCancel());
    const user = userEvent.setup();
    render(
      <ConfirmProvider>
        <Harness />
      </ConfirmProvider>,
    );
    await user.click(screen.getByRole('button'));
    expect(await screen.findByText('go: cancelled')).toBeInTheDocument();
  });

  it('passes the title through to modal.confirm', async () => {
    confirmMock.mockImplementation((opts: any) => opts.onOk());
    const user = userEvent.setup();
    render(
      <ConfirmProvider>
        <Harness />
      </ConfirmProvider>,
    );
    await user.click(screen.getByRole('button'));
    expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Remove saved view' }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ConfirmProvider.test.tsx`
Expected: FAIL — `Failed to resolve import "./ConfirmProvider"`

- [ ] **Step 3: Write `src/components/ConfirmProvider.tsx`**

```tsx
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { App as AntdApp } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined, LogoutOutlined, WarningOutlined } from '@ant-design/icons';

export type ConfirmVariant = 'delete' | 'logout' | 'warning' | 'danger';

export interface ConfirmOptions {
  title: string;
  description?: string;
  variant?: ConfirmVariant;
  okText?: string;
  cancelText?: string;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

const VARIANT_ICON: Record<ConfirmVariant, ReactNode> = {
  delete: <DeleteOutlined />,
  logout: <LogoutOutlined />,
  warning: <WarningOutlined />,
  danger: <ExclamationCircleOutlined />,
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { modal } = AntdApp.useApp();

  const confirm = useMemo<ConfirmFn>(
    () => (options) =>
      new Promise<boolean>((resolve) => {
        modal.confirm({
          title: options.title,
          content: options.description,
          icon: VARIANT_ICON[options.variant ?? 'warning'],
          okText: options.okText ?? 'Confirm',
          cancelText: options.cancelText ?? 'Cancel',
          okButtonProps:
            options.variant === 'delete' || options.variant === 'danger' ? { danger: true } : undefined,
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      }),
    [modal],
  );

  return <ConfirmContext.Provider value={confirm}>{children}</ConfirmContext.Provider>;
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ConfirmProvider.test.tsx`
Expected: PASS

- [ ] **Step 5: Wire `ConfirmProvider` into the app, inside AntD's `App` provider**

Modify `src/App.tsx`:

```tsx
import { App as AntdApp } from 'antd';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastListener } from './components/ToastListener';
import { ConfirmProvider } from './components/ConfirmProvider';

function App() {
  return (
    <ThemeProvider>
      <AntdApp>
        <ToastListener />
        <ConfirmProvider>
          <div>Mavera</div>
        </ConfirmProvider>
      </AntdApp>
    </ThemeProvider>
  );
}

export default App;
```

- [ ] **Step 6: Run the full test suite to confirm nothing regressed**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/ConfirmProvider.tsx src/components/ConfirmProvider.test.tsx src/App.tsx
git commit -m "feat: add promise-based useConfirm on top of AntD Modal.confirm"
```

---

## Task 7: API client and interceptors

This is the plan's densest test-first task (Review Focus items 1, 3, and 4 all live here) — the interceptor behaviors are interdependent, so the test suite and implementation are each written whole rather than one assertion at a time.

**Files:**
- Create: `src/api/index.ts`
- Test: `src/api/index.test.ts`

**Interfaces:**
- Consumes: `fireToast` from Task 4's `src/lib/toastEvents.ts`.
- Produces: `TOKEN_KEY`, `REFRESH_TOKEN_KEY` constants; `clearCloudSummaryCaches(): void`; `createApiClient(baseURL, options?): AxiosInstance`; `api` (the app's configured singleton instance) — Task 8's `AuthContext` and Task 15/16's `HomePage` both import `api` for real requests; tests import `createApiClient` directly to build isolated instances with injected `navigate`/`waitMs`.

Add `axios-mock-adapter` to `devDependencies` if Task 1's `package.json` doesn't already include it (it does — see Task 1, Step 1).

- [ ] **Step 1: Write the failing test suite**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { createApiClient, clearCloudSummaryCaches, TOKEN_KEY, REFRESH_TOKEN_KEY } from './index';

const BASE_URL = 'http://test.local/api';

function setup() {
  const navigate = vi.fn();
  const waitMs = vi.fn().mockResolvedValue(undefined);
  const client = createApiClient(BASE_URL, { navigate, waitMs });
  const mock = new MockAdapter(client);
  const rawMock = new MockAdapter(axios);
  return { client, mock, rawMock, navigate, waitMs };
}

describe('api client interceptors', () => {
  let mocks: ReturnType<typeof setup>;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mocks = setup();
  });

  afterEach(() => {
    mocks.mock.restore();
    mocks.rawMock.restore();
  });

  it('attaches the bearer token from localStorage to outgoing requests', async () => {
    localStorage.setItem(TOKEN_KEY, 'abc123');
    mocks.mock.onGet('/ping').reply((config) => [200, { auth: config.headers?.Authorization }]);

    const response = await mocks.client.get('/ping');
    expect(response.data.auth).toBe('Bearer abc123');
  });

  it('coalesces concurrent 401 TokenExpired responses into a single refresh call', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired-token');
    localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-token');

    let refreshCalls = 0;
    mocks.rawMock.onPost(`${BASE_URL}/auth/refresh-token`).reply(() => {
      refreshCalls += 1;
      return [200, { token: 'new-token' }];
    });
    mocks.mock.onGet('/one').reply((config) =>
      config.headers?.Authorization === 'Bearer new-token' ? [200, { ok: true }] : [401, { error: 'TokenExpired' }],
    );
    mocks.mock.onGet('/two').reply((config) =>
      config.headers?.Authorization === 'Bearer new-token' ? [200, { ok: true }] : [401, { error: 'TokenExpired' }],
    );

    const [r1, r2] = await Promise.all([mocks.client.get('/one'), mocks.client.get('/two')]);

    expect(r1.data).toEqual({ ok: true });
    expect(r2.data).toEqual({ ok: true });
    expect(refreshCalls).toBe(1);
    expect(localStorage.getItem(TOKEN_KEY)).toBe('new-token');
  });

  it('hard-logs-out and redirects to login when the refresh call itself fails', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired-token');
    localStorage.setItem(REFRESH_TOKEN_KEY, 'bad-refresh-token');
    mocks.rawMock.onPost(`${BASE_URL}/auth/refresh-token`).reply(401);
    mocks.mock.onGet('/one').reply(401, { error: 'TokenExpired' });

    await expect(mocks.client.get('/one')).rejects.toBeTruthy();
    expect(mocks.navigate).toHaveBeenCalledWith('/login?error=session_expired');
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('retries a network error up to 3 times with backoff', async () => {
    mocks.mock.onGet('/flaky').networkError();

    await expect(mocks.client.get('/flaky')).rejects.toBeTruthy();
    expect(mocks.waitMs).toHaveBeenCalledTimes(3);
    expect(mocks.waitMs).toHaveBeenNthCalledWith(1, 1000);
    expect(mocks.waitMs).toHaveBeenNthCalledWith(2, 2000);
    expect(mocks.waitMs).toHaveBeenNthCalledWith(3, 4000);
  });

  it('does not retry a network error on /auth/* routes', async () => {
    mocks.mock.onPost('/auth/login').networkError();

    await expect(mocks.client.post('/auth/login')).rejects.toBeTruthy();
    expect(mocks.waitMs).not.toHaveBeenCalled();
  });

  it('redirects once to /subscription-expired even when two requests both 403 concurrently', async () => {
    mocks.mock.onGet('/one').reply(403, { subscriptionExpired: true, subscription: { plan: 'free' } });
    mocks.mock.onGet('/two').reply(403, { subscriptionExpired: true, subscription: { plan: 'free' } });

    await Promise.allSettled([mocks.client.get('/one'), mocks.client.get('/two')]);

    expect(mocks.navigate).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).toHaveBeenCalledWith('/subscription-expired');
    expect(JSON.parse(sessionStorage.getItem('ccm_expired_sub') ?? '{}')).toEqual({ plan: 'free' });
  });

  it('hard-logs-out when the account is deactivated', async () => {
    mocks.mock.onGet('/one').reply(403, { message: 'Account deactivated by administrator' });

    await expect(mocks.client.get('/one')).rejects.toBeTruthy();
    expect(mocks.navigate).toHaveBeenCalledWith('/login?error=account_deactivated');
  });

  it('fires a toast for a 500 response without redirecting', async () => {
    const toastHandler = vi.fn();
    window.addEventListener('ccm:toast', toastHandler);
    mocks.mock.onGet('/one').reply(500, { message: 'Server error' });

    await expect(mocks.client.get('/one')).rejects.toBeTruthy();
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(toastHandler).toHaveBeenCalledTimes(1);
    window.removeEventListener('ccm:toast', toastHandler);
  });

  it('clearCloudSummaryCaches removes all four provider cache keys', () => {
    localStorage.setItem('ccm_azure_summary', '{}');
    localStorage.setItem('ccm_aws_summary', '{}');
    localStorage.setItem('ccm_btp_summary', '{}');
    localStorage.setItem('ccm_gcp_summary', '{}');
    clearCloudSummaryCaches();
    expect(localStorage.getItem('ccm_azure_summary')).toBeNull();
    expect(localStorage.getItem('ccm_aws_summary')).toBeNull();
    expect(localStorage.getItem('ccm_btp_summary')).toBeNull();
    expect(localStorage.getItem('ccm_gcp_summary')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/api/index.test.ts`
Expected: FAIL — `Failed to resolve import "./index"`

- [ ] **Step 3: Write `src/api/index.ts`**

```ts
import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { fireToast } from '../lib/toastEvents';

export const TOKEN_KEY = 'token';
export const REFRESH_TOKEN_KEY = 'refreshToken';

const CLOUD_SUMMARY_CACHE_KEYS = ['ccm_azure_summary', 'ccm_aws_summary', 'ccm_btp_summary', 'ccm_gcp_summary'];

export function clearCloudSummaryCaches(): void {
  CLOUD_SUMMARY_CACHE_KEYS.forEach((key) => localStorage.removeItem(key));
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
  _retry?: boolean;
}

interface ErrorPayload {
  error?: string;
  message?: string;
  subscriptionExpired?: boolean;
  subscription?: unknown;
}

const RETRY_DELAYS_MS = [1000, 2000, 4000];
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

export interface CreateApiClientOptions {
  navigate?: (path: string) => void;
  waitMs?: (ms: number) => Promise<void>;
}

export function createApiClient(baseURL: string | undefined, options: CreateApiClientOptions = {}): AxiosInstance {
  const navigate = options.navigate ?? ((path: string) => {
    window.location.href = path;
  });
  const wait = options.waitMs ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  let isRefreshing = false;
  let refreshSubscribers: Array<(token: string) => void> = [];
  let isRedirectingToExpired = false;

  function subscribeTokenRefresh(callback: (token: string) => void) {
    refreshSubscribers.push(callback);
  }

  function onRefreshed(token: string) {
    refreshSubscribers.forEach((callback) => callback(token));
    refreshSubscribers = [];
  }

  function hardLogout(redirectPath: string) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    clearCloudSummaryCaches();
    navigate(redirectPath);
  }

  const instance = axios.create({ baseURL });

  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers = config.headers ?? ({} as InternalAxiosRequestConfig['headers']);
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ErrorPayload>) => {
      const config = error.config as RetryableConfig | undefined;
      if (!config) return Promise.reject(error);

      const isAuthRoute = (config.url ?? '').startsWith('/auth/');

      if (!error.response && !isAuthRoute) {
        config._retryCount = config._retryCount ?? 0;
        if (config._retryCount < RETRY_DELAYS_MS.length) {
          const delay = RETRY_DELAYS_MS[config._retryCount];
          config._retryCount += 1;
          await wait(delay);
          return instance(config);
        }
        return Promise.reject(error);
      }

      const status = error.response?.status;
      const data = error.response?.data;

      if (status === 401 && data?.error === 'TokenExpired' && !config._retry) {
        config._retry = true;

        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
            const { data: refreshData } = await axios.post<{ token: string }>(
              `${baseURL}/auth/refresh-token`,
              { refreshToken },
            );
            localStorage.setItem(TOKEN_KEY, refreshData.token);
            isRefreshing = false;
            onRefreshed(refreshData.token);
          } catch (refreshError) {
            isRefreshing = false;
            refreshSubscribers = [];
            hardLogout('/login?error=session_expired');
            return Promise.reject(refreshError);
          }
        }

        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            config.headers = config.headers ?? ({} as InternalAxiosRequestConfig['headers']);
            config.headers.Authorization = `Bearer ${token}`;
            resolve(instance(config));
          });
        });
      }

      if (status === 403 && data?.subscriptionExpired) {
        clearCloudSummaryCaches();
        sessionStorage.setItem('ccm_expired_sub', JSON.stringify(data.subscription ?? {}));
        if (!isRedirectingToExpired) {
          isRedirectingToExpired = true;
          navigate('/subscription-expired');
        }
        return Promise.reject(error);
      }

      if (status === 403 && /deactivated|locked/i.test(data?.message ?? '')) {
        hardLogout('/login?error=account_deactivated');
        return Promise.reject(error);
      }

      if (status && RETRYABLE_STATUS_CODES.includes(status)) {
        fireToast({ type: 'error', message: data?.message ?? 'Something went wrong. Please try again.' });
      }

      return Promise.reject(error);
    },
  );

  return instance;
}

export const api = createApiClient(import.meta.env.VITE_API_URL);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/api/index.test.ts`
Expected: PASS (all 9 test cases)

- [ ] **Step 5: Run the full test suite to confirm nothing regressed**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/api/index.ts src/api/index.test.ts
git commit -m "feat: add axios client with token refresh, retry, and subscription-expiry interceptors"
```

---

## Task 8: `User` type and `AuthContext`

**Files:**
- Create: `src/types/auth.ts`
- Create: `src/context/AuthContext.tsx`
- Test: `src/context/AuthContext.test.tsx`

**Interfaces:**
- Consumes: `api`, `clearCloudSummaryCaches`, `TOKEN_KEY`, `REFRESH_TOKEN_KEY` from Task 7's `src/api/index.ts`.
- Produces: `User` type (`src/types/auth.ts`). `AuthProvider`, `useAuth(): AuthContextValue` where `AuthContextValue = { user, loading, isAuthenticated, invoiceOnly, cloudAccess, features, accountLimits, login, register, logout, refreshUser, unlockAccount, sendOtp, verifyOtp }` (`src/context/AuthContext.tsx`) — every auth page in Tasks 12–14, `ModuleNavigation` in Task 10, and `HomePage` in Tasks 15–16 consume `useAuth()`.

- [ ] **Step 1: Write `src/types/auth.ts`**

```ts
export type CloudProvider = 'azure' | 'aws' | 'btp' | 'gcp';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'owner' | 'member';
  canViewAzure?: boolean;
  canViewAws?: boolean;
  canViewBtp?: boolean;
  canViewGcp?: boolean;
  azureReadOnly?: boolean;
  awsReadOnly?: boolean;
  btpReadOnly?: boolean;
  gcpReadOnly?: boolean;
  invoiceOnly?: boolean;
  cloudAccess?: CloudProvider[];
  features?: Partial<{
    budgets: boolean;
    smartAlerts: boolean;
    syncLogs: boolean;
    recommendations: boolean;
    cloudManagement: boolean;
    invoices: boolean;
  }>;
  accountLimits?: Partial<{ azure: number; aws: number; btp: number; gcp: number }>;
  aiEnabled?: boolean;
}
```

- [ ] **Step 2: Write the failing test suite for `AuthContext.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from '../api';

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api')>();
  return {
    ...actual,
    api: { get: (...args: unknown[]) => getMock(...args), post: (...args: unknown[]) => postMock(...args) },
  };
});

function Consumer() {
  const { user, loading, isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <span data-testid="email">{user?.email ?? 'none'}</span>
      <button onClick={() => login('a@b.com', 'secret')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

function FeaturesConsumer() {
  const { features, accountLimits, cloudAccess } = useAuth();
  return (
    <div>
      <span data-testid="budgets">{String(features.budgets)}</span>
      <span data-testid="azure-limit">{accountLimits.azure}</span>
      <span data-testid="cloud-access-length">{cloudAccess.length}</span>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    getMock.mockReset();
    postMock.mockReset();
  });

  it('starts with loading=true and skips /auth/me when there is no stored token', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(getMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('authed')).toHaveTextContent('false');
  });

  it('calls /auth/me on mount when a token is already stored, and becomes authenticated', async () => {
    localStorage.setItem(TOKEN_KEY, 'existing-token');
    getMock.mockResolvedValue({ data: { id: '1', email: 'a@b.com', role: 'member' } });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('authed')).toHaveTextContent('true'));
    expect(getMock).toHaveBeenCalledWith('/auth/me');
    expect(screen.getByTestId('email')).toHaveTextContent('a@b.com');
  });

  it('does not flip isAuthenticated true when /auth/me fails with a subscriptionExpired 403', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired-org-token');
    getMock.mockRejectedValue({ response: { status: 403, data: { subscriptionExpired: true } } });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('authed')).toHaveTextContent('false');
    // The redirect to /subscription-expired itself is the api client's job
    // (Task 7); this test only pins that AuthContext does not race it by
    // rendering a /login redirect first.
  });

  it('login re-fetches /auth/me rather than trusting the login response alone', async () => {
    postMock.mockResolvedValue({ data: { token: 'new-token', refreshToken: 'new-refresh' } });
    getMock.mockResolvedValue({ data: { id: '2', email: 'fresh@b.com', role: 'admin' } });
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await user.click(screen.getByText('login'));

    await waitFor(() => expect(screen.getByTestId('email')).toHaveTextContent('fresh@b.com'));
    expect(postMock).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'secret' });
    expect(getMock).toHaveBeenCalledWith('/auth/me');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('new-token');
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('new-refresh');
  });

  it('logout clears tokens, cloud summary caches, and user state', async () => {
    localStorage.setItem(TOKEN_KEY, 'existing-token');
    localStorage.setItem('ccm_azure_summary', '{}');
    getMock.mockResolvedValue({ data: { id: '1', email: 'a@b.com', role: 'member' } });
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('authed')).toHaveTextContent('true'));

    await user.click(screen.getByText('logout'));

    expect(screen.getByTestId('authed')).toHaveTextContent('false');
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem('ccm_azure_summary')).toBeNull();
  });

  it('derives default features/accountLimits/cloudAccess when the user omits them', async () => {
    localStorage.setItem(TOKEN_KEY, 'existing-token');
    getMock.mockResolvedValue({ data: { id: '1', email: 'a@b.com', role: 'member' } });

    render(
      <AuthProvider>
        <FeaturesConsumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('budgets')).toHaveTextContent('true'));
    expect(screen.getByTestId('azure-limit')).toHaveTextContent('3');
    expect(screen.getByTestId('cloud-access-length')).toHaveTextContent('0');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/context/AuthContext.test.tsx`
Expected: FAIL — `Failed to resolve import "./AuthContext"`

- [ ] **Step 4: Write `src/context/AuthContext.tsx`**

```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, clearCloudSummaryCaches, TOKEN_KEY, REFRESH_TOKEN_KEY } from '../api';
import type { User, CloudProvider } from '../types/auth';

export interface RegisterPayload {
  organizationName: string;
  email: string;
  password: string;
  fullName: string;
  cloudAccess: CloudProvider[];
  invoiceOnly: boolean;
}

interface Features {
  budgets: boolean;
  smartAlerts: boolean;
  syncLogs: boolean;
  recommendations: boolean;
  cloudManagement: boolean;
  invoices: boolean;
}

interface AccountLimits {
  azure: number;
  aws: number;
  btp: number;
  gcp?: number;
}

const DEFAULT_FEATURES: Features = {
  budgets: true,
  smartAlerts: true,
  syncLogs: true,
  recommendations: true,
  cloudManagement: true,
  invoices: true,
};

const DEFAULT_ACCOUNT_LIMITS: AccountLimits = { azure: 3, aws: 3, btp: 3 };

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  invoiceOnly: boolean;
  cloudAccess: CloudProvider[];
  features: Features;
  accountLimits: AccountLimits;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  unlockAccount: (unlockToken: string) => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface ApiErrorLike {
  response?: { status?: number; data?: { subscriptionExpired?: boolean } };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get<User>('/auth/me');
      setUser(data);
    } catch (error) {
      const { status, data } = (error as ApiErrorLike).response ?? {};
      if (status === 403 && data?.subscriptionExpired) {
        // api/index.ts's own interceptor already redirects to
        // /subscription-expired — do not flip isAuthenticated false here,
        // which would otherwise flash a redirect to /login first.
        return;
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem(TOKEN_KEY)) {
      void fetchMe();
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post<{ token: string; refreshToken: string }>('/auth/login', {
        email,
        password,
      });
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      // Re-fetch rather than trust the login response's own permission
      // payload, which can lag the database.
      await fetchMe();
    },
    [fetchMe],
  );

  const register = useCallback(async (payload: RegisterPayload) => {
    await api.post('/auth/register', payload);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    clearCloudSummaryCaches();
    setUser(null);
  }, []);

  const refreshUser = useCallback(() => fetchMe(), [fetchMe]);

  const unlockAccount = useCallback(async (unlockToken: string) => {
    await api.post('/auth/unlock-account', { unlockToken });
  }, []);

  const sendOtp = useCallback(async (email: string) => {
    await api.post('/auth/send-otp', { email });
  }, []);

  const verifyOtp = useCallback(async (email: string, otp: string) => {
    await api.post('/auth/verify-otp', { email, otp });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      invoiceOnly: user?.invoiceOnly ?? false,
      cloudAccess: user?.cloudAccess ?? [],
      features: { ...DEFAULT_FEATURES, ...user?.features },
      accountLimits: { ...DEFAULT_ACCOUNT_LIMITS, ...user?.accountLimits },
      login,
      register,
      logout,
      refreshUser,
      unlockAccount,
      sendOtp,
      verifyOtp,
    }),
    [user, loading, login, register, logout, refreshUser, unlockAccount, sendOtp, verifyOtp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/context/AuthContext.test.tsx`
Expected: PASS (all 6 test cases)

- [ ] **Step 6: Run the full test suite to confirm nothing regressed**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/types/auth.ts src/context/AuthContext.tsx src/context/AuthContext.test.tsx
git commit -m "feat: add User type and AuthContext with token-refresh-safe /auth/me flow"
```

---

## Task 9: Permission derivation helper

Extracts the reference app's inline `HomePage` permission-flag block (`canViewX`/`XReadOnly`/`canWriteX`/`allowConnectX`, invoice-only/hybrid-org logic) into one typed, independently tested helper, so it is written once rather than duplicated per page starting in phase 2. Covers Review Focus item 5.

**Files:**
- Create: `src/lib/permissions.ts`
- Test: `src/lib/permissions.test.ts`

**Interfaces:**
- Consumes: `User`, `CloudProvider` from Task 8's `src/types/auth.ts`.
- Produces: `isPrivileged(user): boolean`, `derivePermissions(user, cloudAccess, invoiceOnly): PermissionSet` where `PermissionSet = { isPrivileged, isHybridOrg, canConnectCloud, azure, aws, btp, gcp }` and each provider entry is `{ canView, readOnly, canWrite, orgHasAccess, allowConnect }` — consumed by Task 10's `ModuleNavigation` and Task 15/16's `HomePage`.

- [ ] **Step 1: Write the failing test suite**

```ts
import { describe, it, expect } from 'vitest';
import { derivePermissions, isPrivileged } from './permissions';
import type { User } from '../types/auth';

const baseUser: User = { id: '1', email: 'a@b.com', role: 'member' };

describe('permissions', () => {
  it('isPrivileged is true only for admin/owner roles', () => {
    expect(isPrivileged({ ...baseUser, role: 'admin' })).toBe(true);
    expect(isPrivileged({ ...baseUser, role: 'owner' })).toBe(true);
    expect(isPrivileged({ ...baseUser, role: 'member' })).toBe(false);
    expect(isPrivileged(null)).toBe(false);
  });

  it('a member with no canView* flags sees every cloud as inaccessible, without crashing', () => {
    const result = derivePermissions(baseUser, ['azure', 'aws'], false);
    expect(result.azure.canView).toBe(false);
    expect(result.aws.canView).toBe(false);
    expect(result.btp.canView).toBe(false);
    expect(result.gcp.canView).toBe(false);
  });

  it('handles a null user without throwing', () => {
    expect(() => derivePermissions(null, [], false)).not.toThrow();
    const result = derivePermissions(null, [], false);
    expect(result.isPrivileged).toBe(false);
    expect(result.azure.canView).toBe(false);
  });

  it('admins/owners bypass canView*/readOnly flags entirely', () => {
    const admin: User = { ...baseUser, role: 'admin', azureReadOnly: true };
    const result = derivePermissions(admin, [], false);
    expect(result.azure.canView).toBe(true);
    expect(result.azure.readOnly).toBe(false);
    expect(result.azure.canWrite).toBe(true);
  });

  it('a read-only member can view but not write', () => {
    const readOnlyMember: User = { ...baseUser, canViewAzure: true, azureReadOnly: true };
    const result = derivePermissions(readOnlyMember, ['azure'], false);
    expect(result.azure.canView).toBe(true);
    expect(result.azure.readOnly).toBe(true);
    expect(result.azure.canWrite).toBe(false);
  });

  it('allowConnect requires org access, view permission, and either write access or privilege', () => {
    const writer: User = { ...baseUser, canViewAzure: true };
    const result = derivePermissions(writer, ['azure'], false);
    expect(result.azure.allowConnect).toBe(true);

    const readOnly: User = { ...baseUser, canViewAzure: true, azureReadOnly: true };
    const readOnlyResult = derivePermissions(readOnly, ['azure'], false);
    expect(readOnlyResult.azure.allowConnect).toBe(false);

    const noOrgAccess: User = { ...baseUser, canViewAzure: true };
    const noOrgAccessResult = derivePermissions(noOrgAccess, [], false);
    expect(noOrgAccessResult.azure.allowConnect).toBe(false);
  });

  it('canConnectCloud is false for a pure invoice-only org, true for a hybrid org', () => {
    const invoiceOnlyResult = derivePermissions(baseUser, [], true);
    expect(invoiceOnlyResult.canConnectCloud).toBe(false);
    expect(invoiceOnlyResult.isHybridOrg).toBe(false);

    const hybridResult = derivePermissions(baseUser, ['azure'], true);
    expect(hybridResult.canConnectCloud).toBe(true);
    expect(hybridResult.isHybridOrg).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/permissions.test.ts`
Expected: FAIL — `Failed to resolve import "./permissions"`

- [ ] **Step 3: Write `src/lib/permissions.ts`**

```ts
import type { User, CloudProvider } from '../types/auth';

export interface ProviderPermissions {
  canView: boolean;
  readOnly: boolean;
  canWrite: boolean;
  orgHasAccess: boolean;
  allowConnect: boolean;
}

export interface PermissionSet {
  isPrivileged: boolean;
  isHybridOrg: boolean;
  canConnectCloud: boolean;
  azure: ProviderPermissions;
  aws: ProviderPermissions;
  btp: ProviderPermissions;
  gcp: ProviderPermissions;
}

const CLOUD_VIEW_FLAGS = {
  azure: 'canViewAzure',
  aws: 'canViewAws',
  btp: 'canViewBtp',
  gcp: 'canViewGcp',
} as const;

const CLOUD_READONLY_FLAGS = {
  azure: 'azureReadOnly',
  aws: 'awsReadOnly',
  btp: 'btpReadOnly',
  gcp: 'gcpReadOnly',
} as const;

const PROVIDERS = ['azure', 'aws', 'btp', 'gcp'] as const;

export function isPrivileged(user: User | null): boolean {
  return user?.role === 'admin' || user?.role === 'owner';
}

export function derivePermissions(
  user: User | null,
  cloudAccess: CloudProvider[],
  invoiceOnly: boolean,
): PermissionSet {
  const privileged = isPrivileged(user);
  const isHybridOrg = invoiceOnly && cloudAccess.length > 0;
  const canConnectCloud = !invoiceOnly || isHybridOrg;

  const providers = PROVIDERS.reduce(
    (acc, provider) => {
      const canView = privileged || Boolean(user?.[CLOUD_VIEW_FLAGS[provider]]);
      const readOnly = !privileged && Boolean(user?.[CLOUD_READONLY_FLAGS[provider]]);
      const canWrite = canView && !readOnly;
      const orgHasAccess = cloudAccess.includes(provider);
      const allowConnect = canConnectCloud && orgHasAccess && canView && (canWrite || privileged);

      acc[provider] = { canView, readOnly, canWrite, orgHasAccess, allowConnect };
      return acc;
    },
    {} as Record<CloudProvider, ProviderPermissions>,
  );

  return {
    isPrivileged: privileged,
    isHybridOrg,
    canConnectCloud,
    azure: providers.azure,
    aws: providers.aws,
    btp: providers.btp,
    gcp: providers.gcp,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/permissions.test.ts`
Expected: PASS (all 7 test cases)

- [ ] **Step 5: Commit**

```bash
git add src/lib/permissions.ts src/lib/permissions.test.ts
git commit -m "feat: extract derivePermissions helper for per-cloud view/write/connect gating"
```

---

## Task 10: Navigation resolution, `ModuleNavigation`, and `AppShell`

Nav visibility/lock logic is written as a pure function (`resolveNav`) tested directly, so `ModuleNavigation`'s own tests only need to smoke-test top-level rendering rather than fight AntD's floating submenu popups in jsdom. Covers Review Focus item 5 for the nav layer.

**Files:**
- Create: `src/layout/navConfig.ts`
- Test: `src/layout/navConfig.test.ts`
- Create: `src/layout/ModuleNavigation.tsx`
- Test: `src/layout/ModuleNavigation.test.tsx`
- Create: `src/layout/AppShell.tsx`
- Test: `src/layout/AppShell.test.tsx`

**Interfaces:**
- Consumes: `PermissionSet` from Task 9; `useAuth` from Task 8; `StatusTag` from Task 5.
- Produces: `resolveNav(permissions): ResolvedNavEntry[]` (`src/layout/navConfig.ts`); `ModuleNavigation` component; `AppShell` component (default export target for the app's protected route layout — Task 17 mounts it in `App.tsx`'s router).

- [ ] **Step 1: Write the failing test suite for `navConfig.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { resolveNav, type ResolvedNavEntry } from './navConfig';
import { derivePermissions } from '../lib/permissions';
import type { User } from '../types/auth';

function group(entries: ResolvedNavEntry[], key: string) {
  const entry = entries.find((e) => e.key === key);
  if (!entry || entry.type !== 'group') throw new Error(`group ${key} not found`);
  return entry;
}

describe('resolveNav', () => {
  it('hides Administration for a non-privileged member', () => {
    const member: User = { id: '1', email: 'a@b.com', role: 'member' };
    const entries = resolveNav(derivePermissions(member, [], false));
    expect(entries.find((e) => e.key === 'administration')).toBeUndefined();
  });

  it('shows Administration for an admin', () => {
    const admin: User = { id: '1', email: 'a@b.com', role: 'admin' };
    const entries = resolveNav(derivePermissions(admin, [], false));
    expect(entries.find((e) => e.key === 'administration')).toBeDefined();
  });

  it('locks every cloud provider for a member with no org cloud access, without throwing', () => {
    const member: User = { id: '1', email: 'a@b.com', role: 'member' };
    expect(() => resolveNav(derivePermissions(member, [], false))).not.toThrow();
    const entries = resolveNav(derivePermissions(member, [], false));
    const cloudCosts = group(entries, 'cloud-costs');
    expect(cloudCosts.children.every((leaf) => leaf.locked)).toBe(true);
  });

  it('unlocks a cloud provider only when the org has access and the user can view it', () => {
    const member: User = { id: '1', email: 'a@b.com', role: 'member', canViewAzure: true };
    const entries = resolveNav(derivePermissions(member, ['azure'], false));
    const cloudCosts = group(entries, 'cloud-costs');
    const azure = cloudCosts.children.find((leaf) => leaf.key === 'azure')!;
    const aws = cloudCosts.children.find((leaf) => leaf.key === 'aws')!;
    expect(azure.locked).toBe(false);
    expect(aws.locked).toBe(true);
  });

  it('locks Budgets & Alerts unless privileged or able to view Azure/AWS/BTP (GCP excluded, matching the reference app)', () => {
    const gcpOnlyMember: User = { id: '1', email: 'a@b.com', role: 'member', canViewGcp: true };
    const entries = resolveNav(derivePermissions(gcpOnlyMember, ['gcp'], false));
    expect(group(entries, 'governance').children[0].locked).toBe(true);

    const azureMember: User = { id: '1', email: 'a@b.com', role: 'member', canViewAzure: true };
    const azureEntries = resolveNav(derivePermissions(azureMember, ['azure'], false));
    expect(group(azureEntries, 'governance').children[0].locked).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/layout/navConfig.test.ts`
Expected: FAIL — `Failed to resolve import "./navConfig"`

- [ ] **Step 3: Write `src/layout/navConfig.ts`**

```ts
import type { PermissionSet } from '../lib/permissions';

interface NavLeafDef {
  key: string;
  label: string;
  path: string;
  locked?: (permissions: PermissionSet) => boolean;
}

type NavNodeDef =
  | ({ type: 'leaf' } & NavLeafDef)
  | {
      type: 'group';
      key: string;
      label: string;
      visible?: (permissions: PermissionSet) => boolean;
      children: NavLeafDef[];
    };

const NAV_TREE: NavNodeDef[] = [
  { type: 'leaf', key: 'dashboard', label: 'Dashboard', path: '/' },
  {
    type: 'group',
    key: 'cloud-costs',
    label: 'Cloud Costs',
    children: [
      { key: 'azure', label: 'Azure', path: '/azure', locked: (p) => !p.azure.canView || !p.azure.orgHasAccess },
      { key: 'aws', label: 'AWS', path: '/aws', locked: (p) => !p.aws.canView || !p.aws.orgHasAccess },
      { key: 'btp', label: 'SAP BTP', path: '/btp', locked: (p) => !p.btp.canView || !p.btp.orgHasAccess },
      { key: 'gcp', label: 'Google Cloud', path: '/gcp', locked: (p) => !p.gcp.canView || !p.gcp.orgHasAccess },
    ],
  },
  {
    type: 'group',
    key: 'optimisation',
    label: 'Optimisation',
    children: [
      { key: 'recommendations', label: 'Recommendations', path: '/recommendations' },
      { key: 'smart-alerts', label: 'Smart Alerts', path: '/smart-alerts' },
    ],
  },
  {
    type: 'group',
    key: 'operations',
    label: 'Operations',
    children: [{ key: 'invoices', label: 'Invoices', path: '/invoices' }],
  },
  {
    type: 'group',
    key: 'governance',
    label: 'Governance',
    children: [
      {
        key: 'budgets',
        label: 'Budgets & Alerts',
        path: '/budgets',
        // Matches the reference app's own gating exactly (GCP is excluded
        // from this OR-check there too) — a known quirk in the reference
        // app, reproduced rather than silently "fixed" here.
        locked: (p) => !(p.isPrivileged || p.azure.canView || p.aws.canView || p.btp.canView),
      },
    ],
  },
  {
    type: 'group',
    key: 'account',
    label: 'Account',
    children: [{ key: 'subscription', label: 'Subscription', path: '/subscription' }],
  },
  {
    type: 'group',
    key: 'administration',
    label: 'Administration',
    visible: (p) => p.isPrivileged,
    children: [
      { key: 'users', label: 'User Management', path: '/users' },
      { key: 'sync-logs', label: 'Sync Logs', path: '/sync-logs' },
    ],
  },
];

export interface ResolvedNavLeaf {
  key: string;
  label: string;
  path: string;
  locked: boolean;
}

export type ResolvedNavEntry =
  | ({ type: 'leaf' } & ResolvedNavLeaf)
  | { type: 'group'; key: string; label: string; children: ResolvedNavLeaf[] };

export function resolveNav(permissions: PermissionSet): ResolvedNavEntry[] {
  return NAV_TREE.filter((node) => (node.type === 'group' && node.visible ? node.visible(permissions) : true)).map(
    (node): ResolvedNavEntry => {
      if (node.type === 'leaf') {
        return {
          type: 'leaf',
          key: node.key,
          label: node.label,
          path: node.path,
          locked: node.locked?.(permissions) ?? false,
        };
      }
      return {
        type: 'group',
        key: node.key,
        label: node.label,
        children: node.children.map((leaf) => ({
          key: leaf.key,
          label: leaf.label,
          path: leaf.path,
          locked: leaf.locked?.(permissions) ?? false,
        })),
      };
    },
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/layout/navConfig.test.ts`
Expected: PASS (all 5 test cases)

- [ ] **Step 5: Write the failing test suite for `ModuleNavigation.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ModuleNavigation } from './ModuleNavigation';
import type { AuthContextValue } from '../context/AuthContext';
import type { User } from '../types/auth';

const useAuthMock = vi.fn<[], AuthContextValue>();

vi.mock('../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../context/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

function mockAuth(user: User, overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user,
    loading: false,
    isAuthenticated: true,
    invoiceOnly: false,
    cloudAccess: [],
    features: {
      budgets: true,
      smartAlerts: true,
      syncLogs: true,
      recommendations: true,
      cloudManagement: true,
      invoices: true,
    },
    accountLimits: { azure: 3, aws: 3, btp: 3 },
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    unlockAccount: vi.fn(),
    sendOtp: vi.fn(),
    verifyOtp: vi.fn(),
    ...overrides,
  };
}

describe('ModuleNavigation', () => {
  it('renders every visible top-level group for a plain member', () => {
    useAuthMock.mockReturnValue(mockAuth({ id: '1', email: 'a@b.com', role: 'member' }));
    render(
      <MemoryRouter>
        <ModuleNavigation />
      </MemoryRouter>,
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Cloud Costs')).toBeInTheDocument();
    expect(screen.getByText('Optimisation')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
    expect(screen.getByText('Governance')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.queryByText('Administration')).not.toBeInTheDocument();
  });

  it('renders Administration for an admin', () => {
    useAuthMock.mockReturnValue(mockAuth({ id: '1', email: 'a@b.com', role: 'admin' }));
    render(
      <MemoryRouter>
        <ModuleNavigation />
      </MemoryRouter>,
    );
    expect(screen.getByText('Administration')).toBeInTheDocument();
  });

  it('does not throw for a user missing every optional permission field', () => {
    useAuthMock.mockReturnValue(mockAuth({ id: '1', email: 'a@b.com', role: 'member' }));
    expect(() =>
      render(
        <MemoryRouter>
          <ModuleNavigation />
        </MemoryRouter>,
      ),
    ).not.toThrow();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/layout/ModuleNavigation.test.tsx`
Expected: FAIL — `Failed to resolve import "./ModuleNavigation"`

- [ ] **Step 7: Write `src/layout/ModuleNavigation.tsx`**

```tsx
import { useMemo } from 'react';
import { Menu, type MenuProps } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { LockOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { derivePermissions } from '../lib/permissions';
import { resolveNav, type ResolvedNavLeaf } from './navConfig';
import { StatusTag } from '../components/StatusTag';

function LeafLabel({ leaf }: { leaf: ResolvedNavLeaf }) {
  return (
    <Link to={leaf.path}>
      {leaf.label}
      {leaf.locked && (
        <>
          {' '}
          <LockOutlined style={{ marginLeft: 4 }} />
          <StatusTag tone="neutral">Upgrade</StatusTag>
        </>
      )}
    </Link>
  );
}

export function ModuleNavigation() {
  const { user, cloudAccess, invoiceOnly } = useAuth();
  const location = useLocation();
  const permissions = useMemo(
    () => derivePermissions(user, cloudAccess, invoiceOnly),
    [user, cloudAccess, invoiceOnly],
  );
  const entries = useMemo(() => resolveNav(permissions), [permissions]);

  const items: MenuProps['items'] = useMemo(
    () =>
      entries.map((entry) =>
        entry.type === 'leaf'
          ? { key: entry.key, label: <LeafLabel leaf={entry} /> }
          : {
              key: entry.key,
              label: entry.label,
              children: entry.children.map((leaf) => ({ key: leaf.key, label: <LeafLabel leaf={leaf} /> })),
            },
      ),
    [entries],
  );

  const allLeaves = useMemo(
    () => entries.flatMap((entry) => (entry.type === 'leaf' ? [entry] : entry.children)),
    [entries],
  );
  const selectedKeys = useMemo(() => {
    const match = allLeaves.find((leaf) => leaf.path === location.pathname);
    return match ? [match.key] : [];
  }, [allLeaves, location.pathname]);

  return <Menu mode="horizontal" selectedKeys={selectedKeys} items={items} />;
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/layout/ModuleNavigation.test.tsx`
Expected: PASS (all 3 test cases)

- [ ] **Step 9: Write the failing test suite for `AppShell.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import type { AuthContextValue } from '../context/AuthContext';

const useAuthMock = vi.fn<[], AuthContextValue>();

vi.mock('../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../context/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

function baseAuth(overrides: Partial<AuthContextValue>): AuthContextValue {
  return {
    user: { id: '1', email: 'a@b.com', role: 'member' },
    loading: false,
    isAuthenticated: true,
    invoiceOnly: false,
    cloudAccess: [],
    features: {
      budgets: true,
      smartAlerts: true,
      syncLogs: true,
      recommendations: true,
      cloudManagement: true,
      invoices: true,
    },
    accountLimits: { azure: 3, aws: 3, btp: 3 },
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    unlockAccount: vi.fn(),
    sendOtp: vi.fn(),
    verifyOtp: vi.fn(),
    ...overrides,
  };
}

function renderShell(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route element={<AppShell />}>
          <Route path="/" element={<div>Home content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppShell', () => {
  it('shows a loading indicator while auth is resolving', () => {
    useAuthMock.mockReturnValue(baseAuth({ loading: true, isAuthenticated: false }));
    renderShell();
    expect(screen.getByLabelText('Loading application')).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    useAuthMock.mockReturnValue(baseAuth({ loading: false, isAuthenticated: false, user: null }));
    renderShell();
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('renders the brand, navigation, and routed content once authenticated', () => {
    useAuthMock.mockReturnValue(baseAuth({}));
    renderShell();
    expect(screen.getByText('MAVERA')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Home content')).toBeInTheDocument();
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npx vitest run src/layout/AppShell.test.tsx`
Expected: FAIL — `Failed to resolve import "./AppShell"`

- [ ] **Step 11: Write `src/layout/AppShell.tsx`**

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { Layout, Spin } from 'antd';
import { useAuth } from '../context/AuthContext';
import { ModuleNavigation } from './ModuleNavigation';

const { Header, Content } = Layout;

export function AppShell() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" aria-label="Loading application" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', gap: 24, position: 'sticky', top: 0, zIndex: 100 }}>
        <span className="mv-heading" style={{ fontSize: 18, letterSpacing: '0.04em', color: 'var(--mv-on-action)' }}>
          MAVERA
        </span>
        <ModuleNavigation />
      </Header>
      <Content style={{ padding: 24 }}>
        <Outlet />
      </Content>
    </Layout>
  );
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npx vitest run src/layout/AppShell.test.tsx`
Expected: PASS (all 3 test cases)

- [ ] **Step 13: Run the full test suite to confirm nothing regressed**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 14: Commit**

```bash
git add src/layout/navConfig.ts src/layout/navConfig.test.ts src/layout/ModuleNavigation.tsx src/layout/ModuleNavigation.test.tsx src/layout/AppShell.tsx src/layout/AppShell.test.tsx
git commit -m "feat: add nav resolution, ModuleNavigation, and AppShell with auth-gated layout"
```

---

## Task 11: Shell chrome — Footer, ContextBar, AppBreadcrumb, ProfileMenu

`ContextBar` and `AppBreadcrumb` are built and tested as standalone, reusable primitives but not yet wired into `AppShell` — the spec calls this out as deliberately minimal in phase 1, since the only page that exists (`HomePage`, Tasks 15–16) sits at the nav root with no ancestor trail or per-page scope controls worth deriving yet. `ProfileMenu` and `Footer` are wired into `AppShell` because they're always-present shell chrome, not per-page content.

**Files:**
- Create: `src/layout/Footer.tsx`
- Test: `src/layout/Footer.test.tsx`
- Create: `src/layout/ContextBar.tsx`
- Test: `src/layout/ContextBar.test.tsx`
- Create: `src/layout/AppBreadcrumb.tsx`
- Test: `src/layout/AppBreadcrumb.test.tsx`
- Create: `src/layout/ProfileMenu.tsx`
- Test: `src/layout/ProfileMenu.test.tsx`
- Modify: `src/layout/AppShell.tsx`
- Modify: `src/layout/AppShell.test.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 8), `useMaveraTheme` (Task 3), `useConfirm` (Task 6).
- Produces: `Footer`, `ContextBar`, `AppBreadcrumb` (+ `BreadcrumbItem` type), `ProfileMenu` — `ContextBar`/`AppBreadcrumb` are available for phase 2+ pages to use; `ProfileMenu`/`Footer` are mounted directly in `AppShell`.

- [ ] **Step 1: Write the failing test for `Footer.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './Footer';

describe('Footer', () => {
  it('renders the required Powered by Maitsys attribution', () => {
    render(<Footer />);
    expect(screen.getByText('Powered by Maitsys')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails, then write `src/layout/Footer.tsx`**

Run: `npx vitest run src/layout/Footer.test.tsx` — Expected: FAIL (`Failed to resolve import "./Footer"`)

```tsx
import { Typography } from 'antd';

export function Footer() {
  return (
    <footer style={{ padding: '16px 24px', textAlign: 'center' }}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Powered by Maitsys
      </Typography.Text>
    </footer>
  );
}
```

Run: `npx vitest run src/layout/Footer.test.tsx` — Expected: PASS

- [ ] **Step 3: Write the failing test for `ContextBar.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContextBar } from './ContextBar';

describe('ContextBar', () => {
  it('renders nothing when there are no controls to show', () => {
    const { container } = render(<ContextBar />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders its children when given scope controls', () => {
    render(
      <ContextBar>
        <span>Last 24 hours</span>
      </ContextBar>,
    );
    expect(screen.getByText('Last 24 hours')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run test to verify it fails, then write `src/layout/ContextBar.tsx`**

Run: `npx vitest run src/layout/ContextBar.test.tsx` — Expected: FAIL (`Failed to resolve import "./ContextBar"`)

```tsx
import type { ReactNode } from 'react';

export function ContextBar({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>{children}</div>;
}
```

Run: `npx vitest run src/layout/ContextBar.test.tsx` — Expected: PASS

- [ ] **Step 5: Write the failing test for `AppBreadcrumb.tsx`**

```tsx
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
```

- [ ] **Step 6: Run test to verify it fails, then write `src/layout/AppBreadcrumb.tsx`**

Run: `npx vitest run src/layout/AppBreadcrumb.test.tsx` — Expected: FAIL (`Failed to resolve import "./AppBreadcrumb"`)

```tsx
import { Breadcrumb } from 'antd';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export function AppBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <Breadcrumb
        items={items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return {
            title:
              item.path && !isCurrent ? (
                <Link to={item.path}>{item.label}</Link>
              ) : (
                <span aria-current={isCurrent ? 'page' : undefined}>{item.label}</span>
              ),
          };
        })}
      />
    </nav>
  );
}
```

Run: `npx vitest run src/layout/AppBreadcrumb.test.tsx` — Expected: PASS

- [ ] **Step 7: Write the failing test suite for `ProfileMenu.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProfileMenu } from './ProfileMenu';
import type { AuthContextValue } from '../context/AuthContext';

const useAuthMock = vi.fn<[], AuthContextValue>();
const useMaveraThemeMock = vi.fn();
const useConfirmMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../context/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

vi.mock('../theme/ThemeProvider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../theme/ThemeProvider')>();
  return { ...actual, useMaveraTheme: () => useMaveraThemeMock() };
});

vi.mock('../components/ConfirmProvider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../components/ConfirmProvider')>();
  return { ...actual, useConfirm: () => useConfirmMock() };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

function auth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: { id: '1', email: 'person@maitsys.com', role: 'member' },
    loading: false,
    isAuthenticated: true,
    invoiceOnly: false,
    cloudAccess: [],
    features: {
      budgets: true,
      smartAlerts: true,
      syncLogs: true,
      recommendations: true,
      cloudManagement: true,
      invoices: true,
    },
    accountLimits: { azure: 3, aws: 3, btp: 3 },
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    unlockAccount: vi.fn(),
    sendOtp: vi.fn(),
    verifyOtp: vi.fn(),
    ...overrides,
  };
}

describe('ProfileMenu', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    useMaveraThemeMock.mockReturnValue({
      mode: 'light',
      density: 'comfortable',
      toggleMode: vi.fn(),
      setDensity: vi.fn(),
      setMode: vi.fn(),
    });
  });

  it('shows the user email and toggles appearance when clicked', async () => {
    const toggleMode = vi.fn();
    useAuthMock.mockReturnValue(auth());
    useMaveraThemeMock.mockReturnValue({
      mode: 'light',
      density: 'comfortable',
      toggleMode,
      setDensity: vi.fn(),
      setMode: vi.fn(),
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ProfileMenu />
      </MemoryRouter>,
    );
    await user.click(screen.getByLabelText('Profile menu'));

    expect(screen.getByText('person@maitsys.com')).toBeInTheDocument();
    await user.click(screen.getByText('Switch to dark appearance'));
    expect(toggleMode).toHaveBeenCalledTimes(1);
  });

  it('logs out and navigates to /login only when the confirm dialog is accepted', async () => {
    const logout = vi.fn();
    useAuthMock.mockReturnValue(auth({ logout }));
    useConfirmMock.mockReturnValue(vi.fn().mockResolvedValue(true));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ProfileMenu />
      </MemoryRouter>,
    );
    await user.click(screen.getByLabelText('Profile menu'));
    await user.click(screen.getByText('Log out'));

    expect(logout).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/login');
  });

  it('does not log out when the confirm dialog is cancelled', async () => {
    const logout = vi.fn();
    useAuthMock.mockReturnValue(auth({ logout }));
    useConfirmMock.mockReturnValue(vi.fn().mockResolvedValue(false));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ProfileMenu />
      </MemoryRouter>,
    );
    await user.click(screen.getByLabelText('Profile menu'));
    await user.click(screen.getByText('Log out'));

    expect(logout).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 8: Run test to verify it fails**

Run: `npx vitest run src/layout/ProfileMenu.test.tsx`
Expected: FAIL — `Failed to resolve import "./ProfileMenu"`

- [ ] **Step 9: Write `src/layout/ProfileMenu.tsx`**

```tsx
import { Avatar, Dropdown, type MenuProps } from 'antd';
import { UserOutlined, BulbOutlined, LogoutOutlined, SettingOutlined, CreditCardOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMaveraTheme } from '../theme/ThemeProvider';
import { useConfirm } from '../components/ConfirmProvider';

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const { mode, density, toggleMode, setDensity } = useMaveraTheme();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const ok = await confirm({ title: 'Log out of Mavera?', variant: 'logout', okText: 'Log out' });
    if (ok) {
      logout();
      navigate('/login');
    }
  };

  const items: MenuProps['items'] = [
    { key: 'email', label: user?.email, disabled: true },
    { type: 'divider' },
    {
      key: 'appearance',
      label: mode === 'dark' ? 'Switch to light appearance' : 'Switch to dark appearance',
      icon: <BulbOutlined />,
      onClick: toggleMode,
    },
    {
      key: 'density',
      label: density === 'compact' ? 'Switch to comfortable density' : 'Switch to compact density',
      icon: <SettingOutlined />,
      onClick: () => setDensity(density === 'compact' ? 'comfortable' : 'compact'),
    },
    { key: 'account', label: <Link to="/account">Account</Link>, icon: <UserOutlined /> },
    { key: 'subscription', label: <Link to="/subscription">Subscription</Link>, icon: <CreditCardOutlined /> },
    { type: 'divider' },
    { key: 'logout', label: 'Log out', icon: <LogoutOutlined />, onClick: handleLogout },
  ];

  return (
    <Dropdown menu={{ items }} trigger={['click']}>
      <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} aria-label="Profile menu" />
    </Dropdown>
  );
}
```

- [ ] **Step 10: Run test to verify it passes**

Run: `npx vitest run src/layout/ProfileMenu.test.tsx`
Expected: PASS (all 3 test cases)

- [ ] **Step 11: Update `AppShell.test.tsx` to expect `ProfileMenu` and `Footer`, and confirm it fails**

`ProfileMenu` is stubbed out here since it already has its own full test suite (Step 7–10) — re-testing its internals from `AppShell` would just duplicate that coverage and add another layer of context mocks to maintain.

Modify `src/layout/AppShell.test.tsx` — add this mock near the top, alongside the existing `useAuth` mock:

```tsx
vi.mock('./ProfileMenu', () => ({
  ProfileMenu: () => <div>Profile menu stub</div>,
}));
```

And extend the last test's assertions:

```tsx
it('renders the brand, navigation, profile menu, footer, and routed content once authenticated', () => {
  useAuthMock.mockReturnValue(baseAuth({}));
  renderShell();
  expect(screen.getByText('MAVERA')).toBeInTheDocument();
  expect(screen.getByText('Dashboard')).toBeInTheDocument();
  expect(screen.getByText('Home content')).toBeInTheDocument();
  expect(screen.getByText('Profile menu stub')).toBeInTheDocument();
  expect(screen.getByText('Powered by Maitsys')).toBeInTheDocument();
});
```

Run: `npx vitest run src/layout/AppShell.test.tsx`
Expected: FAIL — `AppShell` doesn't render `ProfileMenu` or `Footer` yet, so both new assertions fail.

- [ ] **Step 12: Modify `src/layout/AppShell.tsx` to mount `ProfileMenu` and `Footer`**

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { Layout, Spin } from 'antd';
import { useAuth } from '../context/AuthContext';
import { ModuleNavigation } from './ModuleNavigation';
import { ProfileMenu } from './ProfileMenu';
import { Footer } from './Footer';

const { Header, Content } = Layout;

export function AppShell() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" aria-label="Loading application" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', gap: 24, position: 'sticky', top: 0, zIndex: 100 }}>
        <span className="mv-heading" style={{ fontSize: 18, letterSpacing: '0.04em', color: 'var(--mv-on-action)' }}>
          MAVERA
        </span>
        <div style={{ flex: 1 }}>
          <ModuleNavigation />
        </div>
        <ProfileMenu />
      </Header>
      <Content style={{ padding: 24 }}>
        <Outlet />
      </Content>
      <Footer />
    </Layout>
  );
}
```

- [ ] **Step 13: Run test to verify it passes**

Run: `npx vitest run src/layout/AppShell.test.tsx`
Expected: PASS (all 3 test cases)

- [ ] **Step 14: Run the full test suite to confirm nothing regressed**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 15: Commit**

```bash
git add src/layout/Footer.tsx src/layout/Footer.test.tsx src/layout/ContextBar.tsx src/layout/ContextBar.test.tsx src/layout/AppBreadcrumb.tsx src/layout/AppBreadcrumb.test.tsx src/layout/ProfileMenu.tsx src/layout/ProfileMenu.test.tsx src/layout/AppShell.tsx src/layout/AppShell.test.tsx
git commit -m "feat: add Footer, ContextBar, AppBreadcrumb, ProfileMenu; wire ProfileMenu+Footer into AppShell"
```

---

## Task 12: `AuthCarousel` and `LoginPage`

**Files:**
- Copy: `public/auth_dashboard.png`, `public/auth_security.png`, `public/auth_ai.png` (from the reference app's `public/` folder — brand photography, not a design-system concern)
- Create: `src/features/auth/AuthCarousel.tsx`
- Test: `src/features/auth/AuthCarousel.test.tsx`
- Create: `src/features/auth/LoginPage.tsx`
- Test: `src/features/auth/LoginPage.test.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 8); `assets/brand/mavera.png` (already committed at the repo root — see the design system import predating this plan).
- Produces: `AuthCarousel`, `LoginPage` — `LoginPage` is mounted at `/login` in Task 17's router; `AuthCarousel` is reused by Task 14's `RegisterPage`/`ForgotPasswordPage`/`ResetPasswordPage`.

Note: `AuthCarousel` is NOT reused by Tasks 13–14 in this plan as written — each of those pages was scoped without it. If parity across all auth pages is wanted later, revisit Tasks 13–14 to add it; not doing so now avoids widening those already-approved task boundaries during self-review.

- [ ] **Step 1: Copy the auth marketing images**

Run:
```bash
mkdir -p public
cp "C:/Users/vishw/Downloads/public/public/auth_dashboard.png" public/auth_dashboard.png
cp "C:/Users/vishw/Downloads/public/public/auth_security.png" public/auth_security.png
cp "C:/Users/vishw/Downloads/public/public/auth_ai.png" public/auth_ai.png
```

- [ ] **Step 2: Write the failing test suite for `AuthCarousel.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthCarousel } from './AuthCarousel';

describe('AuthCarousel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the first slide initially', () => {
    render(<AuthCarousel />);
    expect(screen.getByText('See spend across every cloud in one place')).toBeInTheDocument();
  });

  it('advances to the next slide every 5 seconds', () => {
    render(<AuthCarousel />);
    vi.advanceTimersByTime(5000);
    expect(screen.getByText('Stay ahead of risk with continuous monitoring')).toBeInTheDocument();
    vi.advanceTimersByTime(5000);
    expect(screen.getByText('Ask your cost data questions in plain English')).toBeInTheDocument();
  });

  it('loops back to the first slide after the last one', () => {
    render(<AuthCarousel />);
    vi.advanceTimersByTime(15000);
    expect(screen.getByText('See spend across every cloud in one place')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails, then write `src/features/auth/AuthCarousel.tsx`**

Run: `npx vitest run src/features/auth/AuthCarousel.test.tsx` — Expected: FAIL (`Failed to resolve import "./AuthCarousel"`)

```tsx
import { useEffect, useState } from 'react';

interface Slide {
  src: string;
  alt: string;
  caption: string;
}

const SLIDES: Slide[] = [
  {
    src: '/auth_dashboard.png',
    alt: 'Cloud Cost Monitoring dashboard',
    caption: 'See spend across every cloud in one place',
  },
  {
    src: '/auth_security.png',
    alt: 'Security posture overview',
    caption: 'Stay ahead of risk with continuous monitoring',
  },
  {
    src: '/auth_ai.png',
    alt: 'AI copilot answering a cost question',
    caption: 'Ask your cost data questions in plain English',
  },
];

const ROTATE_MS = 5000;

export function AuthCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const slide = SLIDES[index];

  return (
    <div role="group" aria-label="Product highlights" style={{ textAlign: 'center' }}>
      <img src={slide.src} alt={slide.alt} style={{ maxWidth: '100%' }} />
      <p>{slide.caption}</p>
    </div>
  );
}
```

Run: `npx vitest run src/features/auth/AuthCarousel.test.tsx` — Expected: PASS (all 3 test cases)

- [ ] **Step 4: Write the failing test suite for `LoginPage.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import type { AuthContextValue } from '../../context/AuthContext';

const useAuthMock = vi.fn<[], AuthContextValue>();
const navigateMock = vi.fn();

vi.mock('../../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../context/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

function auth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: null,
    loading: false,
    isAuthenticated: false,
    invoiceOnly: false,
    cloudAccess: [],
    features: {
      budgets: true,
      smartAlerts: true,
      syncLogs: true,
      recommendations: true,
      cloudManagement: true,
      invoices: true,
    },
    accountLimits: { azure: 3, aws: 3, btp: 3 },
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    unlockAccount: vi.fn(),
    sendOtp: vi.fn(),
    verifyOtp: vi.fn(),
    ...overrides,
  };
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('logs in and navigates to / on success', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue(auth({ login }));
    const user = userEvent.setup();

    renderAt('/login');
    await user.type(screen.getByLabelText('Email'), 'person@maitsys.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(login).toHaveBeenCalledWith('person@maitsys.com', 'secret123');
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('shows an inline error message on invalid credentials', async () => {
    const login = vi.fn().mockRejectedValue({ response: { data: { message: 'Incorrect email or password.' } } });
    useAuthMock.mockReturnValue(auth({ login }));
    const user = userEvent.setup();

    renderAt('/login');
    await user.type(screen.getByLabelText('Email'), 'person@maitsys.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Incorrect email or password.')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('switches to the unlock-account sub-flow when the login response says the account is locked', async () => {
    const login = vi.fn().mockRejectedValue({ response: { data: { locked: true } } });
    const unlockAccount = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue(auth({ login, unlockAccount }));
    const user = userEvent.setup();

    renderAt('/login');
    await user.type(screen.getByLabelText('Email'), 'person@maitsys.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByText('Your account is locked. Enter the unlock code we sent you.'),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('Unlock code'), 'ABC123');
    await user.click(screen.getByRole('button', { name: 'Unlock account' }));

    expect(unlockAccount).toHaveBeenCalledWith('ABC123');
    expect(await screen.findByText('Your account has been unlocked. You can now log in.')).toBeInTheDocument();
  });

  it('shows a session-expired notice when the query string says so', () => {
    useAuthMock.mockReturnValue(auth());
    renderAt('/login?error=session_expired');
    expect(screen.getByText('Your session expired. Please sign in again.')).toBeInTheDocument();
  });

  it('renders the full uncropped Mavera brand lockup (spec §3 — "sign-in/about pages" per the design doc)', () => {
    useAuthMock.mockReturnValue(auth());
    renderAt('/login');
    const logo = screen.getByRole('img', { name: 'Mavera' });
    expect(logo).toHaveAttribute('width', '240');
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx vitest run src/features/auth/LoginPage.test.tsx`
Expected: FAIL — `Failed to resolve import "./LoginPage"`

- [ ] **Step 6: Write `src/features/auth/LoginPage.tsx`**

```tsx
import { useState } from 'react';
import { Alert, Button, Form, Input, Typography } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AuthCarousel } from './AuthCarousel';
import maveraLogo from '../../../assets/brand/mavera.png';

interface LoginFormValues {
  email: string;
  password: string;
}

interface UnlockFormValues {
  unlockToken: string;
}

interface LoginErrorResponse {
  response?: { data?: { message?: string; locked?: boolean } };
}

export function LoginPage() {
  const { login, unlockAccount } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [accountLocked, setAccountLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null);

  const sessionError = searchParams.get('error');

  const handleLogin = async (values: LoginFormValues) => {
    setError(null);
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      navigate('/');
    } catch (err) {
      const data = (err as LoginErrorResponse).response?.data;
      if (data?.locked) {
        setAccountLocked(true);
      } else {
        setError(data?.message ?? 'Incorrect email or password.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlock = async (values: UnlockFormValues) => {
    setError(null);
    try {
      await unlockAccount(values.unlockToken);
      setAccountLocked(false);
      setUnlockMessage('Your account has been unlocked. You can now log in.');
    } catch {
      setError('That unlock code is invalid or has expired.');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <img src={maveraLogo} alt="Mavera" width={240} style={{ display: 'block', margin: '0 auto 24px' }} />
          <Typography.Title level={3} className="mv-heading">
            Sign in to Mavera
          </Typography.Title>

          {sessionError === 'session_expired' && (
            <Alert
              type="warning"
              showIcon
              message="Your session expired. Please sign in again."
              style={{ marginBottom: 16 }}
            />
          )}
          {sessionError === 'account_deactivated' && (
            <Alert
              type="error"
              showIcon
              message="This account has been deactivated. Contact your administrator."
              style={{ marginBottom: 16 }}
            />
          )}
          {unlockMessage && <Alert type="success" showIcon message={unlockMessage} style={{ marginBottom: 16 }} />}
          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

          {accountLocked ? (
            <Form layout="vertical" onFinish={handleUnlock}>
              <Typography.Paragraph type="secondary">
                Your account is locked. Enter the unlock code we sent you.
              </Typography.Paragraph>
              <Form.Item name="unlockToken" label="Unlock code" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Button type="primary" htmlType="submit" block>
                Unlock account
              </Button>
            </Form>
          ) : (
            <Form layout="vertical" onFinish={handleLogin}>
              <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                <Input autoComplete="email" />
              </Form.Item>
              <Form.Item name="password" label="Password" rules={[{ required: true }]}>
                <Input.Password autoComplete="current-password" />
              </Form.Item>
              <Button type="primary" htmlType="submit" block loading={submitting}>
                Sign in
              </Button>
            </Form>
          )}

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Link to="/forgot-password">Forgot password?</Link>
            <Link to="/register">Create an account</Link>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, background: 'var(--mv-surface-subtle)' }}>
        <AuthCarousel />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/features/auth/LoginPage.test.tsx`
Expected: PASS (all 4 test cases)

- [ ] **Step 8: Run the full test suite to confirm nothing regressed**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add public/auth_dashboard.png public/auth_security.png public/auth_ai.png src/features/auth/AuthCarousel.tsx src/features/auth/AuthCarousel.test.tsx src/features/auth/LoginPage.tsx src/features/auth/LoginPage.test.tsx
git commit -m "feat: add AuthCarousel and LoginPage with account-locked/unlock sub-flow"
```

---

## Task 13: `RegisterPage` (5-step wizard)

All five steps' fields stay mounted in one `Form` instance throughout (hidden via `display: none` rather than unmounted), with each field's `required` rule scoped to its owning step by reading current `step` state — this preserves values when navigating back and forward, which a per-step-remount approach would lose.

**Files:**
- Create: `src/features/auth/RegisterPage.tsx`
- Test: `src/features/auth/RegisterPage.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `RegisterPayload` (Task 8); `CloudProvider` (Task 8's `src/types/auth.ts`).
- Produces: `RegisterPage` — mounted at `/register` in Task 17's router.

- [ ] **Step 1: Write the failing test suite**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from './RegisterPage';
import type { AuthContextValue } from '../../context/AuthContext';

const useAuthMock = vi.fn<[], AuthContextValue>();
const navigateMock = vi.fn();

vi.mock('../../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../context/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

function auth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: null,
    loading: false,
    isAuthenticated: false,
    invoiceOnly: false,
    cloudAccess: [],
    features: {
      budgets: true,
      smartAlerts: true,
      syncLogs: true,
      recommendations: true,
      cloudManagement: true,
      invoices: true,
    },
    accountLimits: { azure: 3, aws: 3, btp: 3 },
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    unlockAccount: vi.fn(),
    sendOtp: vi.fn(),
    verifyOtp: vi.fn(),
    ...overrides,
  };
}

describe('RegisterPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('walks through all 5 steps and submits with the collected values', async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue(auth({ register }));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Organization name'), 'Acme Corp');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.type(screen.getByLabelText('Full name'), 'Jamie Rivera');
    await user.type(screen.getByLabelText('Email'), 'jamie@acme.com');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.type(screen.getByLabelText('Password'), 'Sup3r$ecret');
    await user.type(screen.getByLabelText('Confirm password'), 'Sup3r$ecret');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.click(screen.getByLabelText('Azure'));
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(register).toHaveBeenCalledWith({
      organizationName: 'Acme Corp',
      fullName: 'Jamie Rivera',
      email: 'jamie@acme.com',
      password: 'Sup3r$ecret',
      cloudAccess: ['azure'],
      invoiceOnly: false,
    });
    expect(navigateMock).toHaveBeenCalledWith('/login');
  });

  it('blocks advancing past step 1 when the organization name is empty', async () => {
    useAuthMock.mockReturnValue(auth());
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Organization name is required.')).toBeInTheDocument();
  });

  it('rejects mismatched passwords before advancing to the cloud-provider step', async () => {
    useAuthMock.mockReturnValue(auth());
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Organization name'), 'Acme Corp');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByLabelText('Full name'), 'Jamie Rivera');
    await user.type(screen.getByLabelText('Email'), 'jamie@acme.com');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByLabelText('Password'), 'Sup3r$ecret');
    await user.type(screen.getByLabelText('Confirm password'), 'different');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/auth/RegisterPage.test.tsx`
Expected: FAIL — `Failed to resolve import "./RegisterPage"`

- [ ] **Step 3: Write `src/features/auth/RegisterPage.tsx`**

```tsx
import { useState } from 'react';
import { Button, Checkbox, Form, Input, Steps, Typography } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, type RegisterPayload } from '../../context/AuthContext';
import type { CloudProvider } from '../../types/auth';

const STEP_FIELDS: string[][] = [
  ['organizationName'],
  ['fullName', 'email'],
  ['password', 'confirmPassword'],
  ['cloudAccess', 'invoiceOnly'],
  [],
];

const CLOUD_OPTIONS: { label: string; value: CloudProvider }[] = [
  { label: 'Azure', value: 'azure' },
  { label: 'AWS', value: 'aws' },
  { label: 'SAP BTP', value: 'btp' },
  { label: 'Google Cloud', value: 'gcp' },
];

interface RegisterFormValues {
  organizationName: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  cloudAccess: CloudProvider[];
  invoiceOnly: boolean;
}

function passwordStrengthScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm<RegisterFormValues>();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState('');

  const goNext = async () => {
    try {
      await form.validateFields(STEP_FIELDS[step]);
      setStep((s) => s + 1);
    } catch {
      // form.validateFields already renders the field-level error text
    }
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const values = form.getFieldsValue(true) as RegisterFormValues;
      const payload: RegisterPayload = {
        organizationName: values.organizationName,
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        cloudAccess: values.cloudAccess ?? [],
        invoiceOnly: values.invoiceOnly ?? false,
      };
      await register(payload);
      navigate('/login');
    } catch {
      setError('Registration failed. Please check your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const strength = passwordStrengthScore(password);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <Typography.Title level={3} className="mv-heading">
        Create your Mavera account
      </Typography.Title>

      <Steps
        current={step}
        size="small"
        items={[
          { title: 'Organization' },
          { title: 'Personal info' },
          { title: 'Password' },
          { title: 'Cloud providers' },
          { title: 'Review' },
        ]}
        style={{ marginBottom: 24 }}
      />

      {error && <Typography.Text type="danger">{error}</Typography.Text>}

      <Form form={form} layout="vertical" initialValues={{ cloudAccess: [], invoiceOnly: false }}>
        <div style={{ display: step === 0 ? 'block' : 'none' }}>
          <Form.Item
            name="organizationName"
            label="Organization name"
            rules={[{ required: step === 0, message: 'Organization name is required.' }]}
          >
            <Input />
          </Form.Item>
        </div>

        <div style={{ display: step === 1 ? 'block' : 'none' }}>
          <Form.Item
            name="fullName"
            label="Full name"
            rules={[{ required: step === 1, message: 'Full name is required.' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: step === 1, type: 'email', message: 'Enter a valid email address.' }]}
          >
            <Input />
          </Form.Item>
        </div>

        <div style={{ display: step === 2 ? 'block' : 'none' }}>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: step === 2, min: 8, message: 'Password must be at least 8 characters.' }]}
          >
            <Input.Password onChange={(e) => setPassword(e.target.value)} />
          </Form.Item>
          <Typography.Text type="secondary">Password strength: {strength} / 5</Typography.Text>
          <Form.Item
            name="confirmPassword"
            label="Confirm password"
            dependencies={['password']}
            rules={[
              { required: step === 2, message: 'Please confirm your password.' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('Passwords do not match.'));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
        </div>

        <div style={{ display: step === 3 ? 'block' : 'none' }}>
          <Form.Item name="cloudAccess" label="Which cloud providers do you use?">
            <Checkbox.Group options={CLOUD_OPTIONS} />
          </Form.Item>
          <Form.Item name="invoiceOnly" valuePropName="checked">
            <Checkbox>Invoice-only (no cloud account connections)</Checkbox>
          </Form.Item>
        </div>

        <div style={{ display: step === 4 ? 'block' : 'none' }}>
          <Typography.Paragraph>
            Review your details, then create your account. You can change your plan any time from Subscription.
          </Typography.Paragraph>
        </div>
      </Form>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <Button onClick={goBack} disabled={step === 0}>
          Back
        </Button>
        {step < 4 ? (
          <Button type="primary" onClick={goNext}>
            Next
          </Button>
        ) : (
          <Button type="primary" loading={submitting} onClick={handleSubmit}>
            Create account
          </Button>
        )}
      </div>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Link to="/login">Already have an account? Sign in</Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/auth/RegisterPage.test.tsx`
Expected: PASS (all 3 test cases)

- [ ] **Step 5: Run the full test suite to confirm nothing regressed**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/auth/RegisterPage.tsx src/features/auth/RegisterPage.test.tsx
git commit -m "feat: add 5-step RegisterPage wizard"
```

---

## Task 14: `ForgotPasswordPage`, `ResetPasswordPage`, `SubscriptionExpiredPage`

These three call `api`/`axios` directly rather than through `AuthContext` methods — they're one-off requests with no state `AuthContext` needs to own, matching the reference app's own mix of context methods and direct API calls for auth-adjacent flows.

**Files:**
- Create: `src/features/auth/ForgotPasswordPage.tsx`
- Test: `src/features/auth/ForgotPasswordPage.test.tsx`
- Create: `src/features/auth/ResetPasswordPage.tsx`
- Test: `src/features/auth/ResetPasswordPage.test.tsx`
- Create: `src/features/auth/SubscriptionExpiredPage.tsx`
- Test: `src/features/auth/SubscriptionExpiredPage.test.tsx`

**Interfaces:**
- Consumes: `api`, `TOKEN_KEY` (Task 7).
- Produces: `ForgotPasswordPage`, `ResetPasswordPage`, `SubscriptionExpiredPage` — all three are mounted in Task 17's router.

- [ ] **Step 1: Write the failing test suite for `ForgotPasswordPage.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ForgotPasswordPage } from './ForgotPasswordPage';

const postMock = vi.fn();

vi.mock('../../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api')>();
  return { ...actual, api: { ...actual.api, post: (...args: unknown[]) => postMock(...args) } };
});

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('submits the email and shows a confirmation message', async () => {
    postMock.mockResolvedValue({ data: {} });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText('Email'), 'person@maitsys.com');
    await user.click(screen.getByRole('button', { name: 'Send reset instructions' }));

    expect(postMock).toHaveBeenCalledWith('/auth/forgot-password', { email: 'person@maitsys.com' });
    expect(
      await screen.findByText("If that email exists, we've sent password reset instructions."),
    ).toBeInTheDocument();
  });

  it('shows an error message when the request fails', async () => {
    postMock.mockRejectedValue(new Error('network down'));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText('Email'), 'person@maitsys.com');
    await user.click(screen.getByRole('button', { name: 'Send reset instructions' }));

    expect(await screen.findByText('We could not process that request. Please try again.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails, then write `src/features/auth/ForgotPasswordPage.tsx`**

Run: `npx vitest run src/features/auth/ForgotPasswordPage.test.tsx` — Expected: FAIL (`Failed to resolve import "./ForgotPasswordPage"`)

```tsx
import { useState } from 'react';
import { Alert, Button, Form, Input, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { api } from '../../api';

interface ForgotPasswordFormValues {
  email: string;
}

export function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: ForgotPasswordFormValues) => {
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email: values.email });
      setSent(true);
    } catch {
      setError('We could not process that request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: 24 }}>
      <Typography.Title level={3} className="mv-heading">
        Reset your password
      </Typography.Title>

      {sent ? (
        <Alert type="success" showIcon message="If that email exists, we've sent password reset instructions." />
      ) : (
        <Form layout="vertical" onFinish={handleSubmit}>
          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: 'email', message: 'Enter a valid email address.' }]}
          >
            <Input autoComplete="email" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>
            Send reset instructions
          </Button>
        </Form>
      )}

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Link to="/login">Back to sign in</Link>
      </div>
    </div>
  );
}
```

Run: `npx vitest run src/features/auth/ForgotPasswordPage.test.tsx` — Expected: PASS (both test cases)

- [ ] **Step 3: Write the failing test suite for `ResetPasswordPage.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ResetPasswordPage } from './ResetPasswordPage';

const postMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('../../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api')>();
  return { ...actual, api: { ...actual.api, post: (...args: unknown[]) => postMock(...args) } };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    postMock.mockReset();
    navigateMock.mockReset();
  });

  it('shows a missing-token message when no token is in the query string', () => {
    renderAt('/reset-password');
    expect(screen.getByText('This reset link is missing its token. Request a new one.')).toBeInTheDocument();
  });

  it('submits the new password with the token and navigates to /login on success', async () => {
    postMock.mockResolvedValue({ data: {} });
    const user = userEvent.setup();

    renderAt('/reset-password?token=abc123');
    await user.type(screen.getByLabelText('New password'), 'NewSecret1!');
    await user.type(screen.getByLabelText('Confirm new password'), 'NewSecret1!');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(postMock).toHaveBeenCalledWith('/auth/reset-password', { token: 'abc123', password: 'NewSecret1!' });
    expect(navigateMock).toHaveBeenCalledWith('/login');
  });

  it('shows a mismatch error before submitting', async () => {
    const user = userEvent.setup();

    renderAt('/reset-password?token=abc123');
    await user.type(screen.getByLabelText('New password'), 'NewSecret1!');
    await user.type(screen.getByLabelText('Confirm new password'), 'different');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run test to verify it fails, then write `src/features/auth/ResetPasswordPage.tsx`**

Run: `npx vitest run src/features/auth/ResetPasswordPage.test.tsx` — Expected: FAIL (`Failed to resolve import "./ResetPasswordPage"`)

```tsx
import { useState } from 'react';
import { Alert, Button, Form, Input, Typography } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api';

interface ResetPasswordFormValues {
  password: string;
  confirmPassword: string;
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: ResetPasswordFormValues) => {
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, password: values.password });
      navigate('/login');
    } catch {
      setError('That reset link is invalid or has expired.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div style={{ maxWidth: 360, margin: '80px auto', padding: 24 }}>
        <Alert type="error" showIcon message="This reset link is missing its token. Request a new one." />
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Link to="/forgot-password">Request a new link</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: 24 }}>
      <Typography.Title level={3} className="mv-heading">
        Choose a new password
      </Typography.Title>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

      <Form layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="password"
          label="New password"
          rules={[{ required: true, min: 8, message: 'Password must be at least 8 characters.' }]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="Confirm new password"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Please confirm your new password.' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) return Promise.resolve();
                return Promise.reject(new Error('Passwords do not match.'));
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={submitting}>
          Reset password
        </Button>
      </Form>
    </div>
  );
}
```

Run: `npx vitest run src/features/auth/ResetPasswordPage.test.tsx` — Expected: PASS (all 3 test cases)

- [ ] **Step 5: Write the failing test suite for `SubscriptionExpiredPage.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import { SubscriptionExpiredPage } from './SubscriptionExpiredPage';
import { TOKEN_KEY } from '../../api';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return { ...actual, default: { ...actual.default, get: vi.fn() } };
});

describe('SubscriptionExpiredPage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    navigateMock.mockReset();
    vi.mocked(axios.get).mockReset();
  });

  it('shows the cached plan name from sessionStorage', () => {
    sessionStorage.setItem('ccm_expired_sub', JSON.stringify({ plan: 'Professional' }));
    render(
      <MemoryRouter>
        <SubscriptionExpiredPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByText('Your Professional plan needs to be renewed to keep monitoring your cloud costs.'),
    ).toBeInTheDocument();
  });

  it('does not call /auth/me when there is no stored token', () => {
    render(
      <MemoryRouter>
        <SubscriptionExpiredPage />
      </MemoryRouter>,
    );
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('navigates to / when a background /auth/me check succeeds (subscription renewed)', async () => {
    localStorage.setItem(TOKEN_KEY, 'still-valid-token');
    vi.mocked(axios.get).mockResolvedValue({ data: {} });

    render(
      <MemoryRouter>
        <SubscriptionExpiredPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/'));
  });

  it('stays on the page when the background /auth/me check still fails', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired-token');
    vi.mocked(axios.get).mockRejectedValue(new Error('still 403'));

    render(
      <MemoryRouter>
        <SubscriptionExpiredPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Run test to verify it fails, then write `src/features/auth/SubscriptionExpiredPage.tsx`**

Run: `npx vitest run src/features/auth/SubscriptionExpiredPage.test.tsx` — Expected: FAIL (`Failed to resolve import "./SubscriptionExpiredPage"`)

```tsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Card, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { TOKEN_KEY } from '../../api';

interface CachedSubscription {
  plan?: string;
  expiredAt?: string;
}

function readCachedSubscription(): CachedSubscription {
  try {
    return JSON.parse(sessionStorage.getItem('ccm_expired_sub') ?? '{}');
  } catch {
    return {};
  }
}

export function SubscriptionExpiredPage() {
  const navigate = useNavigate();
  const [subscription] = useState<CachedSubscription>(() => readCachedSubscription());

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    let cancelled = false;
    // Bypasses the wrapped `api` instance deliberately: that instance's own
    // interceptor is what redirected here in the first place, and reusing
    // it would just loop straight back to this page on every 403.
    axios
      .get(`${import.meta.env.VITE_API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(() => {
        if (!cancelled) navigate('/');
      })
      .catch(() => {
        // still expired — stay on this page
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div style={{ maxWidth: 480, margin: '80px auto', padding: 24, textAlign: 'center' }}>
      <Typography.Title level={3} className="mv-heading">
        Your subscription has expired
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        {subscription.plan
          ? `Your ${subscription.plan} plan needs to be renewed to keep monitoring your cloud costs.`
          : 'Your organization needs to renew its subscription to keep monitoring cloud costs.'}
      </Typography.Paragraph>
      <Card style={{ textAlign: 'left', marginTop: 24 }}>
        <Typography.Text strong>Need help?</Typography.Text>
        <Typography.Paragraph type="secondary">
          Contact your administrator or Maitsys support to renew your plan.
        </Typography.Paragraph>
      </Card>
      <Button type="primary" style={{ marginTop: 24 }} onClick={() => navigate('/login')}>
        Back to sign in
      </Button>
    </div>
  );
}
```

Run: `npx vitest run src/features/auth/SubscriptionExpiredPage.test.tsx` — Expected: PASS (all 4 test cases)

- [ ] **Step 7: Run the full test suite to confirm nothing regressed**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/features/auth/ForgotPasswordPage.tsx src/features/auth/ForgotPasswordPage.test.tsx src/features/auth/ResetPasswordPage.tsx src/features/auth/ResetPasswordPage.test.tsx src/features/auth/SubscriptionExpiredPage.tsx src/features/auth/SubscriptionExpiredPage.test.tsx
git commit -m "feat: add ForgotPasswordPage, ResetPasswordPage, and SubscriptionExpiredPage"
```

---

## Task 15: Dashboard data layer and KPI rendering

Each of the reference app's six parallel dashboard requests is tracked as an independent loading/error/data source rather than one combined `Promise.allSettled` batch — this is what makes "one integration outage does not remove other modules" (design doc §11.1) actually true: a slow or failing source doesn't hold up the others from rendering as soon as they resolve.

**Files:**
- Create: `src/features/dashboard/useDashboardData.ts`
- Test: `src/features/dashboard/useDashboardData.test.ts`
- Create: `src/features/dashboard/HomePage.tsx`
- Test: `src/features/dashboard/HomePage.test.tsx`

**Interfaces:**
- Consumes: `api` (Task 7); `useAuth`, `derivePermissions` (Tasks 8–9); `EmptyState` (Task 5).
- Produces: `DashboardSource<T>`, `DashboardData`, `useDashboardData(): DashboardData & { refetch: () => void }` — Task 16 extends `HomePage` with charts and the onboarding wizard using this same hook's data.

- [ ] **Step 1: Write the failing test suite for `useDashboardData.ts`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardData } from './useDashboardData';
import { api } from '../../api';

vi.mock('../../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api')>();
  return { ...actual, api: { ...actual.api, get: vi.fn() } };
});

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it('starts every source in a loading state', () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useDashboardData());
    expect(result.current.summary.loading).toBe(true);
    expect(result.current.recommendations.loading).toBe(true);
  });

  it('populates each source independently as its own request resolves', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/summary/dashboard') {
        return Promise.resolve({ data: { totalSpend: 12000, currency: 'USD', periodLabel: 'Month to date' } });
      }
      if (url === '/recommendations') {
        return new Promise(() => {});
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.summary.loading).toBe(false));
    expect(result.current.summary.data).toEqual({
      totalSpend: 12000,
      currency: 'USD',
      periodLabel: 'Month to date',
    });
    expect(result.current.recommendations.loading).toBe(true);
  });

  it('records a per-source error without affecting other sources', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/budgets') return Promise.reject(new Error('boom'));
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.budgets.loading).toBe(false));
    expect(result.current.budgets.error).toBe('Unable to load this data right now.');
    await waitFor(() => expect(result.current.invoices.loading).toBe(false));
    expect(result.current.invoices.error).toBeNull();
  });

  it('refetch resets every source back to loading and re-requests', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.invoices.loading).toBe(false));

    vi.mocked(api.get).mockClear();
    result.current.refetch();

    expect(result.current.summary.loading).toBe(true);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/dashboard/useDashboardData.test.ts`
Expected: FAIL — `Failed to resolve import "./useDashboardData"`

- [ ] **Step 3: Write `src/features/dashboard/useDashboardData.ts`**

```ts
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';

export interface DashboardSummary {
  totalSpend: number;
  currency: string;
  periodLabel: string;
  previousPeriodChangePct?: number;
}

export interface RecommendationItem {
  id: string;
  estimatedMonthlySavings?: number;
}

export interface SmartAlertItem {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface BudgetItem {
  id: string;
  overBudget?: boolean;
}

export interface MspSavings {
  estimatedSavings: number;
  currency: string;
}

export interface InvoiceItem {
  id: string;
}

export interface DashboardSource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface DashboardData {
  summary: DashboardSource<DashboardSummary>;
  recommendations: DashboardSource<RecommendationItem[]>;
  smartAlerts: DashboardSource<SmartAlertItem[]>;
  budgets: DashboardSource<BudgetItem[]>;
  mspSavings: DashboardSource<MspSavings>;
  invoices: DashboardSource<InvoiceItem[]>;
}

function initialSource<T>(): DashboardSource<T> {
  return { data: null, loading: true, error: null };
}

async function loadSource<T>(request: () => Promise<{ data: T }>): Promise<DashboardSource<T>> {
  try {
    const { data } = await request();
    return { data, loading: false, error: null };
  } catch {
    return { data: null, loading: false, error: 'Unable to load this data right now.' };
  }
}

export function useDashboardData(): DashboardData & { refetch: () => void } {
  const [state, setState] = useState<DashboardData>({
    summary: initialSource(),
    recommendations: initialSource(),
    smartAlerts: initialSource(),
    budgets: initialSource(),
    mspSavings: initialSource(),
    invoices: initialSource(),
  });

  const load = useCallback(() => {
    setState({
      summary: initialSource(),
      recommendations: initialSource(),
      smartAlerts: initialSource(),
      budgets: initialSource(),
      mspSavings: initialSource(),
      invoices: initialSource(),
    });

    loadSource<DashboardSummary>(() => api.get('/summary/dashboard')).then((summary) =>
      setState((s) => ({ ...s, summary })),
    );
    loadSource<RecommendationItem[]>(() => api.get('/recommendations')).then((recommendations) =>
      setState((s) => ({ ...s, recommendations })),
    );
    loadSource<SmartAlertItem[]>(() => api.get('/smart-alerts', { params: { pageSize: 10 } })).then(
      (smartAlerts) => setState((s) => ({ ...s, smartAlerts })),
    );
    loadSource<BudgetItem[]>(() => api.get('/budgets')).then((budgets) => setState((s) => ({ ...s, budgets })));
    loadSource<MspSavings>(() => api.get('/insights/msp-savings')).then((mspSavings) =>
      setState((s) => ({ ...s, mspSavings })),
    );
    loadSource<InvoiceItem[]>(() => api.get('/invoices', { params: { pageSize: 500 } })).then((invoices) =>
      setState((s) => ({ ...s, invoices })),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refetch: load };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/dashboard/useDashboardData.test.ts`
Expected: PASS (all 4 test cases)

- [ ] **Step 5: Write the failing test suite for `HomePage.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomePage } from './HomePage';
import type { AuthContextValue } from '../../context/AuthContext';
import type { DashboardData } from './useDashboardData';

const useAuthMock = vi.fn<[], AuthContextValue>();
const useDashboardDataMock = vi.fn<[], DashboardData & { refetch: () => void }>();

vi.mock('../../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../context/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

vi.mock('./useDashboardData', () => ({ useDashboardData: () => useDashboardDataMock() }));

function auth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: { id: '1', email: 'a@b.com', role: 'member', canViewAzure: true },
    loading: false,
    isAuthenticated: true,
    invoiceOnly: false,
    cloudAccess: ['azure'],
    features: {
      budgets: true,
      smartAlerts: true,
      syncLogs: true,
      recommendations: true,
      cloudManagement: true,
      invoices: true,
    },
    accountLimits: { azure: 3, aws: 3, btp: 3 },
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    unlockAccount: vi.fn(),
    sendOtp: vi.fn(),
    verifyOtp: vi.fn(),
    ...overrides,
  };
}

function loadedSource<T>(data: T) {
  return { data, loading: false, error: null };
}
function loadingSource() {
  return { data: null, loading: true, error: null };
}
function erroredSource(error: string) {
  return { data: null, loading: false, error };
}

function dashboardData(overrides: Partial<DashboardData> = {}): DashboardData & { refetch: () => void } {
  return {
    summary: loadedSource({ totalSpend: 12000, currency: 'USD', periodLabel: 'Month to date' }),
    recommendations: loadedSource([{ id: 'r1' }]),
    smartAlerts: loadedSource([{ id: 'a1', severity: 'high' as const }]),
    budgets: loadedSource([{ id: 'b1' }]),
    mspSavings: loadedSource({ estimatedSavings: 800, currency: 'USD' }),
    invoices: loadedSource([{ id: 'i1' }]),
    refetch: vi.fn(),
    ...overrides,
  } as DashboardData & { refetch: () => void };
}

describe('HomePage', () => {
  it('shows an onboarding empty state when the org has no cloud access at all', () => {
    useAuthMock.mockReturnValue(auth({ cloudAccess: [], user: { id: '1', email: 'a@b.com', role: 'member' } }));
    useDashboardDataMock.mockReturnValue(dashboardData());
    render(<HomePage />);
    expect(screen.getByText('Connect your first cloud account')).toBeInTheDocument();
  });

  it('does not show a KPI value while its source is still loading', () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData({ summary: loadingSource() }));
    render(<HomePage />);
    expect(screen.queryByText('$12,000.00')).not.toBeInTheDocument();
  });

  it('renders each KPI value once its source has loaded', () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData());
    render(<HomePage />);
    expect(screen.getByText('$12,000.00')).toBeInTheDocument();
    expect(screen.getByText('Open recommendations')).toBeInTheDocument();
  });

  it('shows a per-source error without hiding KPIs that loaded successfully', () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(
      dashboardData({ budgets: erroredSource('Unable to load this data right now.') }),
    );
    render(<HomePage />);
    expect(screen.getByText('Unable to load this data right now.')).toBeInTheDocument();
    expect(screen.getByText('$12,000.00')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/features/dashboard/HomePage.test.tsx`
Expected: FAIL — `Failed to resolve import "./HomePage"`

- [ ] **Step 7: Write `src/features/dashboard/HomePage.tsx`**

```tsx
import { Alert, Card, Col, Row, Skeleton, Statistic, Typography } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { derivePermissions } from '../../lib/permissions';
import { useDashboardData } from './useDashboardData';
import { EmptyState } from '../../components/EmptyState';

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

interface KpiCardProps {
  title: string;
  loading: boolean;
  error: string | null;
  value: string | number | null;
}

function KpiCard({ title, loading, error, value }: KpiCardProps) {
  return (
    <Card>
      {loading ? (
        <Skeleton active paragraph={false} />
      ) : error ? (
        <Alert type="error" showIcon message={error} />
      ) : (
        <Statistic title={title} value={value ?? '—'} />
      )}
    </Card>
  );
}

export function HomePage() {
  const { user, cloudAccess, invoiceOnly } = useAuth();
  const permissions = derivePermissions(user, cloudAccess, invoiceOnly);
  const { summary, recommendations, smartAlerts, budgets, mspSavings, invoices } = useDashboardData();

  const noCloudAccessAtAll =
    !permissions.azure.orgHasAccess &&
    !permissions.aws.orgHasAccess &&
    !permissions.btp.orgHasAccess &&
    !permissions.gcp.orgHasAccess;

  if (noCloudAccessAtAll && !invoiceOnly) {
    return (
      <EmptyState
        icon={<span aria-hidden>☁️</span>}
        heading="Connect your first cloud account"
        explanation="Add an Azure, AWS, SAP BTP, or Google Cloud account to start monitoring costs."
      />
    );
  }

  return (
    <div>
      <Typography.Title level={3} className="mv-heading">
        Dashboard
      </Typography.Title>

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <KpiCard
            title={summary.data?.periodLabel ?? 'Total spend'}
            loading={summary.loading}
            error={summary.error}
            value={summary.data ? formatCurrency(summary.data.totalSpend, summary.data.currency) : null}
          />
        </Col>
        <Col span={8}>
          <KpiCard
            title="Open recommendations"
            loading={recommendations.loading}
            error={recommendations.error}
            value={recommendations.data?.length ?? null}
          />
        </Col>
        <Col span={8}>
          <KpiCard
            title="Active alerts"
            loading={smartAlerts.loading}
            error={smartAlerts.error}
            value={smartAlerts.data?.length ?? null}
          />
        </Col>
        <Col span={8}>
          <KpiCard
            title="Tracked budgets"
            loading={budgets.loading}
            error={budgets.error}
            value={budgets.data?.length ?? null}
          />
        </Col>
        <Col span={8}>
          <KpiCard
            title="Estimated MSP savings"
            loading={mspSavings.loading}
            error={mspSavings.error}
            value={mspSavings.data ? formatCurrency(mspSavings.data.estimatedSavings, mspSavings.data.currency) : null}
          />
        </Col>
        <Col span={8}>
          <KpiCard
            title="Invoices on file"
            loading={invoices.loading}
            error={invoices.error}
            value={invoices.data?.length ?? null}
          />
        </Col>
      </Row>
    </div>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/features/dashboard/HomePage.test.tsx`
Expected: PASS (all 4 test cases)

- [ ] **Step 9: Run the full test suite to confirm nothing regressed**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add src/features/dashboard/useDashboardData.ts src/features/dashboard/useDashboardData.test.ts src/features/dashboard/HomePage.tsx src/features/dashboard/HomePage.test.tsx
git commit -m "feat: add per-source dashboard data hook and HomePage KPI rendering"
```

---

## Task 16: Spend trend chart and the connect-account onboarding wizard

Scoping note: the reference app auto-triggers its onboarding wizard from a "zero connected accounts" check against `/azure/summary`/`/aws/summary` — endpoints outside this phase's declared six dashboard calls. Rather than pull those in now, this task builds the wizard itself as a real, working flow (Steps: connection details → test connection → review → result, calling the real `/azure/accounts` / `/aws/accounts` endpoints) that `HomePage` opens from a manually-triggered "Connect a cloud account" button, gated by `derivePermissions`'s `allowConnect`. The auto-trigger-on-zero-accounts behavior can be added once phase 2 wires up the account-summary data it depends on.

**Files:**
- Modify: `src/features/dashboard/useDashboardData.ts` (add optional `dailyTrend` to `DashboardSummary`)
- Create: `src/features/dashboard/SpendTrendChart.tsx`
- Test: `src/features/dashboard/SpendTrendChart.test.tsx`
- Create: `src/features/dashboard/ConnectCloudAccountWizard.tsx`
- Test: `src/features/dashboard/ConnectCloudAccountWizard.test.tsx`
- Modify: `src/features/dashboard/HomePage.tsx`
- Modify: `src/features/dashboard/HomePage.test.tsx`

**Interfaces:**
- Consumes: `useMaveraTheme`, `chartColors` (Task 3); `api` (Task 7); `CloudProvider` (Task 8); `derivePermissions` (Task 9); `DashboardSummary` (Task 15, extended here).
- Produces: `SpendTrendPoint`, `SpendTrendChart`; `ConnectCloudAccountWizard` — both consumed only by `HomePage` in this plan; phase 2's cloud provider pages will reuse `ConnectCloudAccountWizard`'s pattern (not the component itself, since its provider-specific fields will grow beyond Azure/AWS).

- [ ] **Step 1: Add `dailyTrend` to `DashboardSummary`**

Modify `src/features/dashboard/useDashboardData.ts` — extend the interface (no behavior change; the hook already passes through whatever `/summary/dashboard` returns):

```ts
export interface DashboardSummary {
  totalSpend: number;
  currency: string;
  periodLabel: string;
  previousPeriodChangePct?: number;
  dailyTrend?: { date: string; amount: number }[];
}
```

Run: `npx vitest run src/features/dashboard/useDashboardData.test.ts` — Expected: PASS (unchanged; the new field is optional)

- [ ] **Step 2: Write the failing test suite for `SpendTrendChart.tsx`**

Recharts' `ResponsiveContainer` measures real layout, which is 0×0 in jsdom — the mock below gives it a fixed size so the chart actually renders instead of silently collapsing.

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { SpendTrendChart } from './SpendTrendChart';
import { ThemeProvider } from '../../theme/ThemeProvider';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div style={{ width: 400, height: 240 }}>{children}</div>
    ),
  };
});

describe('SpendTrendChart', () => {
  it('shows an explanatory message instead of an empty chart when there is no data', () => {
    render(
      <ThemeProvider>
        <SpendTrendChart data={[]} />
      </ThemeProvider>,
    );
    expect(screen.getByText('No spend history available for this period.')).toBeInTheDocument();
  });

  it('renders a labelled chart region and a "View data" table alternative', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <SpendTrendChart
          data={[
            { date: '2026-09-01', amount: 120.5 },
            { date: '2026-09-02', amount: 95 },
          ]}
        />
      </ThemeProvider>,
    );
    expect(screen.getByRole('img', { name: 'Daily spend trend' })).toBeInTheDocument();

    await user.click(screen.getByText('View data'));
    expect(screen.getByRole('columnheader', { name: 'Date' })).toBeInTheDocument();
    expect(screen.getByText('2026-09-01')).toBeInTheDocument();
    expect(screen.getByText('120.50')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/dashboard/SpendTrendChart.test.tsx`
Expected: FAIL — `Failed to resolve import "./SpendTrendChart"`

- [ ] **Step 4: Write `src/features/dashboard/SpendTrendChart.tsx`**

```tsx
import { useState } from 'react';
import { Button, Modal, Table } from 'antd';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMaveraTheme } from '../../theme/ThemeProvider';
import { chartColors } from '../../theme/tokens';

export interface SpendTrendPoint {
  date: string;
  amount: number;
}

export function SpendTrendChart({ data }: { data: SpendTrendPoint[] }) {
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  const [tableOpen, setTableOpen] = useState(false);

  if (data.length === 0) {
    return <p>No spend history available for this period.</p>;
  }

  return (
    <div>
      <div role="img" aria-label="Daily spend trend" style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer>
          <AreaChart data={data}>
            <CartesianGrid stroke={colors.grid} vertical={false} />
            <XAxis dataKey="date" stroke={colors.axis} tick={{ fontSize: 12 }} />
            <YAxis stroke={colors.axis} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Area type="monotone" dataKey="amount" stroke={colors.primary} fill={colors.primary} fillOpacity={0.15} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <Button type="link" onClick={() => setTableOpen(true)}>
        View data
      </Button>
      <Modal title="Daily spend trend" open={tableOpen} onCancel={() => setTableOpen(false)} footer={null}>
        <Table
          dataSource={data}
          rowKey="date"
          pagination={false}
          columns={[
            { title: 'Date', dataIndex: 'date' },
            { title: 'Amount', dataIndex: 'amount', render: (value: number) => value.toFixed(2) },
          ]}
        />
      </Modal>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/dashboard/SpendTrendChart.test.tsx`
Expected: PASS (both test cases)

- [ ] **Step 6: Write the failing test suite for `ConnectCloudAccountWizard.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectCloudAccountWizard } from './ConnectCloudAccountWizard';
import { api } from '../../api';

vi.mock('../../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api')>();
  return { ...actual, api: { ...actual.api, post: vi.fn() } };
});

describe('ConnectCloudAccountWizard', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
  });

  it('walks through details -> test -> save -> result for an Azure account', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<ConnectCloudAccountWizard provider="azure" open onClose={onClose} />);

    await user.type(screen.getByLabelText('Account name'), 'Prod subscription');
    await user.type(screen.getByLabelText('Subscription ID'), 'sub-1');
    await user.type(screen.getByLabelText('Tenant ID'), 'tenant-1');
    await user.type(screen.getByLabelText('Client ID'), 'client-1');
    await user.type(screen.getByLabelText('Client secret'), 'secret-1');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.click(screen.getByRole('button', { name: 'Test connection' }));
    expect(await screen.findByText('Connection verified.')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith(
      '/azure/accounts/test',
      expect.objectContaining({ name: 'Prod subscription' }),
    );

    await user.click(screen.getByRole('button', { name: 'Save account' }));
    expect(await screen.findByText('Account connected')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/azure/accounts', expect.objectContaining({ name: 'Prod subscription' }));
  });

  it('shows a failure message when the connection test fails, without advancing the step', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('bad credentials'));
    const user = userEvent.setup();

    render(<ConnectCloudAccountWizard provider="aws" open onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Account name'), 'My AWS account');
    await user.type(screen.getByLabelText('Access key ID'), 'AKIAEXAMPLE');
    await user.type(screen.getByLabelText('Secret access key'), 'secret-key-value');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.click(screen.getByRole('button', { name: 'Test connection' }));
    expect(await screen.findByText('Connection could not be verified.')).toBeInTheDocument();
    expect(screen.queryByText('Save account')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npx vitest run src/features/dashboard/ConnectCloudAccountWizard.test.tsx`
Expected: FAIL — `Failed to resolve import "./ConnectCloudAccountWizard"`

- [ ] **Step 8: Write `src/features/dashboard/ConnectCloudAccountWizard.tsx`**

```tsx
import { useState } from 'react';
import { Alert, Button, Form, Input, Modal, Result, Steps } from 'antd';
import { api } from '../../api';
import type { CloudProvider } from '../../types/auth';

interface ConnectCloudAccountWizardProps {
  provider: Extract<CloudProvider, 'azure' | 'aws'>;
  open: boolean;
  onClose: () => void;
}

interface ConnectionFormValues {
  name: string;
  subscriptionId?: string;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export function ConnectCloudAccountWizard({ provider, open, onClose }: ConnectCloudAccountWizardProps) {
  const [form] = Form.useForm<ConnectionFormValues>();
  const [step, setStep] = useState(0);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failure' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const reset = () => {
    form.resetFields();
    setStep(0);
    setTestResult(null);
    setSubmitError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleTestConnection = async () => {
    await form.validateFields();
    setTesting(true);
    setTestResult(null);
    try {
      await api.post(`/${provider}/accounts/test`, form.getFieldsValue());
      setTestResult('success');
      setStep(2);
    } catch {
      setTestResult('failure');
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post(`/${provider}/accounts`, form.getFieldsValue());
      setStep(3);
    } catch {
      setSubmitError('Could not save this account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Connect ${provider === 'azure' ? 'an Azure' : 'an AWS'} account`}
      open={open}
      onCancel={handleClose}
      footer={null}
      destroyOnClose
    >
      <Steps
        current={step}
        size="small"
        items={[
          { title: 'Connection details' },
          { title: 'Test connection' },
          { title: 'Review' },
          { title: 'Result' },
        ]}
        style={{ marginBottom: 24 }}
      />

      {step === 0 && (
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Account name"
            rules={[{ required: true, message: 'Account name is required.' }]}
          >
            <Input />
          </Form.Item>
          {provider === 'azure' ? (
            <>
              <Form.Item name="subscriptionId" label="Subscription ID" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="tenantId" label="Tenant ID" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="clientId" label="Client ID" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="clientSecret" label="Client secret" rules={[{ required: true }]}>
                <Input.Password />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item name="accessKeyId" label="Access key ID" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="secretAccessKey" label="Secret access key" rules={[{ required: true }]}>
                <Input.Password />
              </Form.Item>
            </>
          )}
          <Button type="primary" onClick={() => setStep(1)}>
            Next
          </Button>
        </Form>
      )}

      {step === 1 && (
        <div>
          {testResult === 'failure' && (
            <Alert type="error" showIcon message="Connection could not be verified." style={{ marginBottom: 16 }} />
          )}
          <Button type="primary" loading={testing} onClick={handleTestConnection}>
            Test connection
          </Button>
        </div>
      )}

      {step === 2 && (
        <div>
          <Alert type="success" showIcon message="Connection verified." style={{ marginBottom: 16 }} />
          {submitError && <Alert type="error" showIcon message={submitError} style={{ marginBottom: 16 }} />}
          <Button type="primary" loading={submitting} onClick={handleSubmit}>
            Save account
          </Button>
        </div>
      )}

      {step === 3 && (
        <Result
          status="success"
          title="Account connected"
          subTitle="It may take a few minutes for the first cost data to appear."
          extra={
            <Button type="primary" onClick={handleClose}>
              Done
            </Button>
          }
        />
      )}
    </Modal>
  );
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npx vitest run src/features/dashboard/ConnectCloudAccountWizard.test.tsx`
Expected: PASS (both test cases)

- [ ] **Step 10: Update `HomePage.test.tsx` to stub the chart and wizard, and add coverage for the connect button**

`SpendTrendChart` and `ConnectCloudAccountWizard` each already have their own full test suites (Steps 2–9) — stub them here the same way Task 11 stubbed `ProfileMenu` inside `AppShell.test.tsx`.

Modify `src/features/dashboard/HomePage.test.tsx` — add near the top (alongside the existing mocks) and add `userEvent` to the imports:

```tsx
import userEvent from '@testing-library/user-event';

vi.mock('./SpendTrendChart', () => ({ SpendTrendChart: () => <div>Spend trend chart stub</div> }));
vi.mock('./ConnectCloudAccountWizard', () => ({
  ConnectCloudAccountWizard: ({ onClose }: { onClose: () => void }) => (
    <div>
      Wizard stub
      <button onClick={onClose}>Close wizard</button>
    </div>
  ),
}));
```

Add these test cases:

```tsx
it('shows a "Connect a cloud account" button when the user can connect Azure', () => {
  useAuthMock.mockReturnValue(auth({ user: { id: '1', email: 'a@b.com', role: 'member', canViewAzure: true } }));
  useDashboardDataMock.mockReturnValue(dashboardData());
  render(<HomePage />);
  expect(screen.getByRole('button', { name: 'Connect a cloud account' })).toBeInTheDocument();
});

it('hides the "Connect a cloud account" button when the user cannot connect any cloud', () => {
  useAuthMock.mockReturnValue(
    auth({
      cloudAccess: ['azure'],
      user: { id: '1', email: 'a@b.com', role: 'member', canViewAzure: true, azureReadOnly: true },
    }),
  );
  useDashboardDataMock.mockReturnValue(dashboardData());
  render(<HomePage />);
  expect(screen.queryByRole('button', { name: 'Connect a cloud account' })).not.toBeInTheDocument();
});

it('opens the connect-account wizard when the button is clicked', async () => {
  useAuthMock.mockReturnValue(auth({ user: { id: '1', email: 'a@b.com', role: 'member', canViewAzure: true } }));
  useDashboardDataMock.mockReturnValue(dashboardData());
  const user = userEvent.setup();
  render(<HomePage />);

  await user.click(screen.getByRole('button', { name: 'Connect a cloud account' }));
  expect(screen.getByText('Wizard stub')).toBeInTheDocument();
});
```

Run: `npx vitest run src/features/dashboard/HomePage.test.tsx` — Expected: FAIL (the button and wizard don't exist in `HomePage.tsx` yet)

- [ ] **Step 11: Modify `src/features/dashboard/HomePage.tsx` to add the trend chart and connect-account button**

```tsx
import { useState } from 'react';
import { Alert, Button, Card, Col, Row, Skeleton, Statistic, Typography } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { derivePermissions } from '../../lib/permissions';
import { useDashboardData } from './useDashboardData';
import { EmptyState } from '../../components/EmptyState';
import { SpendTrendChart } from './SpendTrendChart';
import { ConnectCloudAccountWizard } from './ConnectCloudAccountWizard';

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

interface KpiCardProps {
  title: string;
  loading: boolean;
  error: string | null;
  value: string | number | null;
}

function KpiCard({ title, loading, error, value }: KpiCardProps) {
  return (
    <Card>
      {loading ? (
        <Skeleton active paragraph={false} />
      ) : error ? (
        <Alert type="error" showIcon message={error} />
      ) : (
        <Statistic title={title} value={value ?? '—'} />
      )}
    </Card>
  );
}

export function HomePage() {
  const { user, cloudAccess, invoiceOnly } = useAuth();
  const permissions = derivePermissions(user, cloudAccess, invoiceOnly);
  const { summary, recommendations, smartAlerts, budgets, mspSavings, invoices } = useDashboardData();
  const [wizardProvider, setWizardProvider] = useState<'azure' | 'aws' | null>(null);

  const noCloudAccessAtAll =
    !permissions.azure.orgHasAccess &&
    !permissions.aws.orgHasAccess &&
    !permissions.btp.orgHasAccess &&
    !permissions.gcp.orgHasAccess;

  if (noCloudAccessAtAll && !invoiceOnly) {
    return (
      <EmptyState
        icon={<span aria-hidden>☁️</span>}
        heading="Connect your first cloud account"
        explanation="Add an Azure, AWS, SAP BTP, or Google Cloud account to start monitoring costs."
      />
    );
  }

  const connectableProvider: 'azure' | 'aws' | null = permissions.azure.allowConnect
    ? 'azure'
    : permissions.aws.allowConnect
      ? 'aws'
      : null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={3} className="mv-heading" style={{ margin: 0 }}>
          Dashboard
        </Typography.Title>
        {connectableProvider && (
          <Button type="primary" onClick={() => setWizardProvider(connectableProvider)}>
            Connect a cloud account
          </Button>
        )}
      </div>

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <KpiCard
            title={summary.data?.periodLabel ?? 'Total spend'}
            loading={summary.loading}
            error={summary.error}
            value={summary.data ? formatCurrency(summary.data.totalSpend, summary.data.currency) : null}
          />
        </Col>
        <Col span={8}>
          <KpiCard
            title="Open recommendations"
            loading={recommendations.loading}
            error={recommendations.error}
            value={recommendations.data?.length ?? null}
          />
        </Col>
        <Col span={8}>
          <KpiCard
            title="Active alerts"
            loading={smartAlerts.loading}
            error={smartAlerts.error}
            value={smartAlerts.data?.length ?? null}
          />
        </Col>
        <Col span={8}>
          <KpiCard
            title="Tracked budgets"
            loading={budgets.loading}
            error={budgets.error}
            value={budgets.data?.length ?? null}
          />
        </Col>
        <Col span={8}>
          <KpiCard
            title="Estimated MSP savings"
            loading={mspSavings.loading}
            error={mspSavings.error}
            value={
              mspSavings.data ? formatCurrency(mspSavings.data.estimatedSavings, mspSavings.data.currency) : null
            }
          />
        </Col>
        <Col span={8}>
          <KpiCard
            title="Invoices on file"
            loading={invoices.loading}
            error={invoices.error}
            value={invoices.data?.length ?? null}
          />
        </Col>
      </Row>

      <Card title="Daily spend trend" style={{ marginTop: 16 }}>
        {summary.loading ? (
          <Skeleton active />
        ) : summary.error ? (
          <Alert type="error" showIcon message={summary.error} />
        ) : (
          <SpendTrendChart data={summary.data?.dailyTrend ?? []} />
        )}
      </Card>

      {wizardProvider && (
        <ConnectCloudAccountWizard provider={wizardProvider} open onClose={() => setWizardProvider(null)} />
      )}
    </div>
  );
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npx vitest run src/features/dashboard/HomePage.test.tsx`
Expected: PASS (all 7 test cases)

- [ ] **Step 13: Run the full test suite to confirm nothing regressed**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 14: Commit**

```bash
git add src/features/dashboard/useDashboardData.ts src/features/dashboard/SpendTrendChart.tsx src/features/dashboard/SpendTrendChart.test.tsx src/features/dashboard/ConnectCloudAccountWizard.tsx src/features/dashboard/ConnectCloudAccountWizard.test.tsx src/features/dashboard/HomePage.tsx src/features/dashboard/HomePage.test.tsx
git commit -m "feat: add spend trend chart with data-table alternative and connect-account wizard"
```

---

## Task 17: Wire up `App.tsx` routing

This is the plan's final integration task: every provider and page built in Tasks 1–16 is assembled into one routed app. `/account` and `/subscription` get placeholder routes (linked from `ProfileMenu` since Task 11) rather than 404s, matching the spec's explicit allowance for `/subscription` to exist as a nav-link stub — real pages for both arrive in phase 4.

**Files:**
- Create: `src/features/NotFoundPage.tsx`
- Test: `src/features/NotFoundPage.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes every provider and page produced by Tasks 1–16.
- Produces: the assembled `App` default export — this is the end of the plan; no later task depends on anything new here.

- [ ] **Step 1: Write the failing test for `NotFoundPage.tsx`**

```tsx
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
```

- [ ] **Step 2: Run test to verify it fails, then write `src/features/NotFoundPage.tsx`**

Run: `npx vitest run src/features/NotFoundPage.test.tsx` — Expected: FAIL (`Failed to resolve import "./NotFoundPage"`)

```tsx
import { Button, Result } from 'antd';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <Result
      status="404"
      title="404"
      subTitle="Sorry, this page doesn't exist."
      extra={
        <Link to="/">
          <Button type="primary">Back to dashboard</Button>
        </Link>
      }
    />
  );
}
```

Run: `npx vitest run src/features/NotFoundPage.test.tsx` — Expected: PASS

- [ ] **Step 3: Replace `src/App.test.tsx` with the full routing integration suite**

The original `App.test.tsx` from Task 1 only checked for placeholder text — replace its entire contents now that `App` is the real routed application.

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { api, TOKEN_KEY } from './api';

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn() } };
});

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, '', '/');
    vi.mocked(api.get).mockReset();
  });

  it('redirects an unauthenticated visitor from / to the login page', async () => {
    render(<App />);
    expect(await screen.findByText('Sign in to Mavera')).toBeInTheDocument();
  });

  it('renders the 404 page for an unknown route', async () => {
    window.history.pushState({}, '', '/this-route-does-not-exist');
    render(<App />);
    expect(await screen.findByText("Sorry, this page doesn't exist.")).toBeInTheDocument();
  });

  it('renders the authenticated dashboard shell at / once /auth/me resolves', async () => {
    localStorage.setItem(TOKEN_KEY, 'valid-token');
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/auth/me') return Promise.resolve({ data: { id: '1', email: 'a@b.com', role: 'member' } });
      return Promise.resolve({ data: [] });
    });

    render(<App />);

    expect(await screen.findByText('MAVERA')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — `App.tsx` still just renders a bare `<div>Mavera</div>`, so none of the three assertions can pass.

- [ ] **Step 5: Write the final `src/App.tsx`**

```tsx
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { App as AntdApp } from 'antd';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastListener } from './components/ToastListener';
import { ConfirmProvider } from './components/ConfirmProvider';
import { AuthProvider } from './context/AuthContext';
import { AppShell } from './layout/AppShell';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { SubscriptionExpiredPage } from './features/auth/SubscriptionExpiredPage';
import { HomePage } from './features/dashboard/HomePage';
import { NotFoundPage } from './features/NotFoundPage';

function ComingSoonPage({ title }: { title: string }) {
  return (
    <div style={{ padding: 24 }}>
      <h2 className="mv-heading">{title}</h2>
      <p>This page is coming in a later phase.</p>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AntdApp>
        <ToastListener />
        <ConfirmProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/subscription-expired" element={<SubscriptionExpiredPage />} />

                <Route element={<AppShell />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/account" element={<ComingSoonPage title="Account" />} />
                  <Route path="/subscription" element={<ComingSoonPage title="Subscription" />} />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ConfirmProvider>
      </AntdApp>
    </ThemeProvider>
  );
}

export default App;
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS (all 3 test cases)

- [ ] **Step 7: Run the full test suite to confirm nothing regressed**

Run: `npx vitest run`
Expected: PASS — every test from Tasks 1–17 passes.

- [ ] **Step 8: Commit**

```bash
git add src/features/NotFoundPage.tsx src/features/NotFoundPage.test.tsx src/App.tsx src/App.test.tsx
git commit -m "feat: wire up App routing — auth pages, AppShell, HomePage, and 404"
```

This completes Phase 1 (Foundation). Phases 2–6 (Azure module, remaining cloud modules, shared feature pages, admin portal, AI chat widget) are separate plans, each starting with its own brainstorming/spec cycle per `docs/superpowers/specs/2026-09-26-ccm-foundation-design.md` §1.2.
