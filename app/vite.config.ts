import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/client',
  publicDir: '../../public',
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: {
    port: 5174,
    host: '0.0.0.0',
    allowedHosts: ['test.zenithcred.com', 'localhost'],
    proxy: {
      '/api': {
        target: 'http://localhost:3847',
        timeout: 300_000,
        proxyTimeout: 300_000,
      },
    },
  },
  build: { outDir: '../../dist/client' },
});
