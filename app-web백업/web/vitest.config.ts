import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './__tests__/setup.ts',
    include: ['__tests__/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', 'app/**/__tests__/**', 'src/**/__tests__/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@entrip/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@entrip/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
});