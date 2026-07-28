import AutoImport from 'unplugin-auto-import/vite';
import { defineConfig } from 'vitest/config';

process.env.NODE_OPTIONS = '';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    cache: false,
    // `tests/unit/` est encore vide : sans ça, le projet unit fait échouer la run.
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.*'],
      exclude: ['src/**/entry.ts', 'src/**/index.ts', 'src/**/*.d.ts'],
      all: true,
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['./tests/unit/**/*.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'e2e',
          include: ['./tests/e2e/**/*.spec.ts'],
          // Les tests lancent `dist/` : il doit exister avant la première run.
          // En globalSetup plutôt qu'en `pretest` pour qu'un `vitest` nu reste correct.
          globalSetup: './tests/e2e/global-setup.ts',
          // Les cas sont `concurrent` : il en faut autant de front que de tests.
          maxConcurrency: 12,
          // Un sous-processus Node par cas, plus le build en amont.
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
  plugins: [
    AutoImport({
      dts: 'src/typings/auto-imports.d.ts',
      imports: ['vitest'],
    }),
  ],
});
