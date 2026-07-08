/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // '@' 是本地路径别名（无对应 npm 包），必须在 vite alias 显式配置，
      // 与 tsconfig.json 的 paths '@/*' 对齐。
      '@': fileURLToPath(new URL('./src', import.meta.url)),

      // '@agentblog/shared' 走 workspace 包解析：Bun 在 node_modules 建符号链接，
      // 由 shared/package.json 的 exports 映射到 TS 源码，Vite 据此解析。
      // tsconfig.json 的 paths '@agentblog/shared*' 仅辅助 TS 类型解析（指向 .ts 源），
      // 运行时无需在此重复配置 alias —— 这样也尊重 shared 未来可能的构建步骤。
    },
  },
  server: {
    port: 5173,
    // 开发期把 /api、/uploads 代理到后端，前端写相对路径 /api/... 即同源，零 CORS
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    // 生产不生成 sourcemap，避免部署 dist 时公开前端源码。
    // 若后续需要错误上报（Sentry 等），改用 'hidden'：生成但不被浏览器自动发现，仅供上传。
    sourcemap: false,
  },
  test: {
    // 预配：测试基础设施在 #13 落地，此处占位便于后续直接接入
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
