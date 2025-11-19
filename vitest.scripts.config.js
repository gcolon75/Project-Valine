import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // No setup files for script tests
    css: false,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      'playwright-tests_*.spec.js',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
