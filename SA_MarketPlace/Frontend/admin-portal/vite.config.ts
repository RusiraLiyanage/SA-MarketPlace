import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { src: fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // 5175 is the address the backend's ADMIN_RESET_URL points at.
  server: { port: 5175, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
