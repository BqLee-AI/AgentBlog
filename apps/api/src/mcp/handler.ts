/**
 * MCP 路由处理（详见 docs/design/09 §五）
 *
 * 挂载于 /mcp（由 app.ts 挂载）。🔴 双鉴权分离红线（09 §1.1）：
 *   - 只走 apiKeyMiddleware（X-API-Key），绝不叠加 authMiddleware（JWT）
 *   - apiKeyMiddleware 只读 X-API-Key，不读 Authorization
 *
 * 请求链路：
 *   apiKeyMiddleware（解析 Key → 注入 c.var.apiKeyUser/apiKeyAgent）
 *   → 预检余额（< CREDITS_PER_MCP_CALL → 402，流前拒绝不进工具）
 *   → createMcpServer（绑定该 Agent 上下文 + 计费包装）
 *   → WebStandardStreamableHTTPTransport.handleRequest(c.req.raw)
 *
 * ⚠️ 与 doc 09 §五偏差：用 WebStandardStreamableHTTPServerTransport（非 StreamableHTTPServerTransport），
 *    前者接收 Web Request 返回 Response，适配 Bun/Hono；后者是 Node IncomingMessage 版。
 *    计费用 server.ts 的 wrapTool 包装器（非 transport.onsend，该 transport 无此属性）。
 */
import { Hono } from 'hono'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { env } from '@/config/env'
import { HttpError } from '@/lib/errors'
import { apiKeyMiddleware } from '@/middlewares/api-key'
import { createMcpServer } from './server'
import { Role } from '@agentblog/shared'

export const mcpHandler = new Hono()

// 🔴 所有 /mcp 请求都走 API Key 鉴权（不读 Authorization，双鉴权分离）
mcpHandler.use('*', apiKeyMiddleware)

// MCP 单端点：POST=JSON-RPC 调用，GET=SSE，DELETE=关闭会话（无状态模式统一处理）
mcpHandler.all('/', async (c) => {
  const apiKeyUser = c.var.apiKeyUser
  const apiKeyAgent = c.var.apiKeyAgent

  // 预检：余额不足直接 402（流前拒绝，避免进入工具后扣费失败）
  if (apiKeyUser.credits < env.CREDITS_PER_MCP_CALL) {
    throw HttpError.payment('额度不足，无法调用 MCP')
  }

  // 每请求独立 server 实例（工具上下文绑定到该 API Key 的 Agent）
  const server = createMcpServer({
    agentId: apiKeyAgent.id,
    userId: apiKeyUser.id,
    // API Key 通道按用户身份计费/鉴权（actor.role=user；agent 归属在 tools 层自做）
    role: Role.USER,
  })

  // 无状态 transport：不传 sessionIdGenerator（默认无会话），每请求独立（doc 09 §五）
  const transport = new WebStandardStreamableHTTPServerTransport()

  await server.connect(transport)
  // 把 Hono 的 Web Request 交给 transport，返回标准 Response
  return transport.handleRequest(c.req.raw)
})
