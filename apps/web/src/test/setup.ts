/**
 * Vitest 全局 setup（#2 占位，测试基础设施在 #13 落地）。
 *
 * 预留 MSW server 启停与 jest-dom 匹配器接入点；当前仅保证 test setupFiles 路径有效。
 */
import '@testing-library/jest-dom/vitest'

// MSW server 与 handlers 在 #13 接入：
// import { server } from './server'
// beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
// afterEach(() => server.resetHandlers())
// afterAll(() => server.close())
