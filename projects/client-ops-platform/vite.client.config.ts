import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  root: 'src/client',
  build: {
    outDir: resolve(__dirname, 'dist/client'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/orgs': 'http://localhost:4000',
      '/health': 'http://localhost:4000',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/client'),
    },
  },
});
