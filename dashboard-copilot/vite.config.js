import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3849,
    cors: true,
    allowedHosts: ['copilot.zenithcred.com', 'localhost', '185.239.62.65'],
    proxy: {
      '/api': {
        target: 'http://localhost:3847',
        changeOrigin: true
      }
    }
  }
})
