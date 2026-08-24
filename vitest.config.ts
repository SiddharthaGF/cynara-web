import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: [
      'src/api/__tests__/**/*.{test,spec}.{ts,tsx}',
      'src/features/**/__tests__/**/*.{test,spec}.{ts,tsx}',
      'src/server/**/__tests__/**/*.{test,spec}.{ts,tsx}',
    ],
    setupFiles: ['./vitest.setup.ts'],
  },
});
