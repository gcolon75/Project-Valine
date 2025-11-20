import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',          // force Node runtime (no window)
    pool: 'forks',                 // stable on Windows
    include: ['serverless/tests/**/*.test.js'],
    exclude: [
      'src/test/setup.js',         // don't load browser mocks
      '**/__mocks__/**'
    ],
    globals: true,
    reporters: ['default'],
  },
});
