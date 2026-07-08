import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

const srcPath = fileURLToPath(new URL('./src', import.meta.url))
const sharedIndexPath = fileURLToPath(
  new URL('../../packages/shared/src/index.ts', import.meta.url),
)
const sharedSrcPath = fileURLToPath(new URL('../../packages/shared/src', import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@', replacement: srcPath },
      { find: /^@agentblog\/shared$/, replacement: sharedIndexPath },
      { find: /^@agentblog\/shared\/(.+)$/, replacement: `${sharedSrcPath}/$1` },
    ],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
