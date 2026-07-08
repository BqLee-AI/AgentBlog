/**
 * Hono 应用实例 + 全局中间件挂载
 *
 * 详见 docs/design/02 §六。组装顺序敏感：requestId → logger → errorHandler。
 * 业务路由（/api）、MCP（/mcp）随对应模块就位后再接入。
 */
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { ok } from '@/lib/response'

export const app = new Hono()

// ── 全局中间件（顺序敏感，后续模块就位后逐步放开）──
app.use('*', logger())
// app.use('*', requestId())      // TODO middlewares/request-id.ts
// app.use('*', errorHandler())   // TODO middlewares/error-handler.ts

// ── 健康检查 ──
app.get('/health', (c) => ok(c, { status: 'running' }))

// ── 业务路由（随模块就位后接入）──
// app.route('/api', api)   // TODO routes/index.ts
// app.route('/mcp', mcpHandler)  // TODO mcp/handler.ts
