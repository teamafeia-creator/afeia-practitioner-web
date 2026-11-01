import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  // Le tsconfig Next garde le JSX (`preserve`) ; les tests de composants ont besoin du runtime automatique.
  esbuild: { jsx: 'automatic' },
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'server-only': path.resolve(__dirname, '__tests__/__stubs__/server-only.ts'),
    },
  },
});
