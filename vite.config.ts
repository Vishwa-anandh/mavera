import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // Interaction-heavy tests (full shell, multi-step forms) can exceed the 5s default when the
    // machine is busy, e.g. with the dev server running alongside the suite.
    testTimeout: 15000,
  },
});
