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
import { serveStatic } from 'hono/bun'
import { ok } from '@/lib/response'
import { errorHandler } from '@/middlewares/error-handler'
import { api } from '@/routes'
import { ErrorCode } from '@agentblog/shared'
import { env } from '@/config/env'

export const app = new Hono()

// ── 全局中间件（按执行顺序注册）──
app.use('*', logger())
// app.use('*', requestId())        // TODO middlewares/request-id.ts

// ── 全局错误兜底（app.onError，最外层，不受上面注册顺序影响）──
app.onError(errorHandler)

// ── 404 兜底（未匹配到的路由）──
app.notFound((c) => c.json({ ok: false, error: { code: ErrorCode.NOT_FOUND, message: '接口不存在' } }, 404))

// ── 健康检查 ──
app.get('/health', (c) => ok(c, { status: 'running' }))

// ── 静态文件托管：/uploads/* → env.UPLOAD_DIR（公开，不挂 authMiddleware）──
// 封面/头像本就公开（详见 11 §四/§九）。URL /uploads/<dir>/<file> 映射到 UPLOAD_DIR 下的 <dir>/<file>。
// root 与 storage.save 写入路径同源（都来自 env.UPLOAD_DIR），避免改 UPLOAD_DIR 后读写不一致（review should-fix-2）。
app.use(
  '/uploads/*',
  serveStatic({
    root: env.UPLOAD_DIR,
    // 去掉 /uploads 前缀，保留 /<dir>/<file>，拼到 root 后即 UPLOAD_DIR/<dir>/<file>
    rewriteRequestPath: (p) => p.replace(/^\/uploads/, ''),
  }),
)

// ── 业务路由 ──
app.route('/api', api)
// app.route('/mcp', mcpHandler)  // TODO mcp/handler.ts
