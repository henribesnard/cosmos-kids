import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { novaPlugin } from './server/nova/vitePlugin';

export default defineConfig({
  plugins: [react(), novaPlugin()],
  server: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    globals: true,
  },
});
