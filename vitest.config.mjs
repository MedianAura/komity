import AutoImport from 'unplugin-auto-import/vite';
import { defineConfig } from 'vitest/config';

process.env.NODE_OPTIONS = '';

export default defineConfig({
  test: {
    include: ['./tests/unit/**/*.spec.ts'],
    // setupFiles: './tests/unit/vitest.setup.ts',
    environment: 'happy-dom',
    globals: true,
    cache: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.*'],
      exclude: ['src/**/entry.ts', 'src/**/index.ts', 'src/**/*.d.ts'],
      all: true,
    },
  },
  plugins: [
    AutoImport({
      dts: 'src/typings/auto-imports.d.ts',
      imports: ['vitest'],
    }),
  ],
});
