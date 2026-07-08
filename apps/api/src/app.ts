/**
 * Hono 应用实例 + 全局中间件挂载
 *
 * 详见 docs/design/02 §六。组装方式：
 *   - requestId / logger 走 app.use，按注册顺序执行
 *   - errorHandler 走 app.onError，天然最外层兜底（不受注册顺序影响）
 *
 * 业务路由（/api）、MCP（/mcp）随对应模块就位后再接入。
 */
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { ok } from '@/lib/response'

export const app = new Hono()

// ── 全局中间件（按执行顺序注册）──
app.use('*', logger())
// app.use('*', requestId())        // TODO middlewares/request-id.ts

// ── 全局错误兜底（app.onError，最外层，不受上面注册顺序影响）──
// app.onError(errorHandler())     // TODO middlewares/error-handler.ts

// ── 健康检查 ──
app.get('/health', (c) => ok(c, { status: 'running' }))

// ── 业务路由（随模块就位后接入）──
// app.route('/api', api)   // TODO routes/index.ts
// app.route('/mcp', mcpHandler)  // TODO mcp/handler.ts
