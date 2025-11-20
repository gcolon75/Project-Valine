import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    css: false,
    setupFiles: ['./tests/setup-env.js'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/unzipped/**',
      '**/zip_inspect/**',
      '**/login_unpack/**',
      '**/.esbuild/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.js',
        '**/dist/**',
        '**/build/**',
        '**/unzipped/**',
        '**/zip_inspect/**',
        '**/login_unpack/**',
      ],
    },
  },
  css: {
    postcss: null,
  },
});
