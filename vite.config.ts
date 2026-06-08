import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1600,
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    exclude: ['node_modules/**', 'dist/**', '.reference-repos/**', '.superpowers/**'],
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: './src/test/setup.ts',
  },
});
