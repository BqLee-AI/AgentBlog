/**
 * MCP Server 工厂（详见 docs/design/09 §四/§五）
 *
 * 每个请求构建一个独立的 McpServer 实例（工具上下文绑定到具体 API Key 对应的 Agent），
 * 注册 5 个文章工具（来自 ai/tools.ts），用 wrapTool 包装器在工具成功后按次计费。
 *
 * 🔴 计费策略（doc 09 §5.1 推荐的包装器方案）：
 *   - 仅 tools/call 成功才扣费（env.CREDITS_PER_MCP_CALL，type='mcp_call'）
 *   - tools/list 是协议方法，不计费（不经过工具 handler）
 *   - 工具抛异常 / 返回 isError 不计费
 *
 * ⚠️ 与 docs/design/09 §四的偏差（以 SDK 1.29 真实 API 为准）：
 *   - 用 registerTool（非 deprecated 的 server.tool()）；inputSchema 传 zod raw shape
 *   - 工具返回对齐 SDK 的 CallToolResult：{ content:[{type:'text',text}], isError? }
 *   - 计费用 wrapTool 包装器（非 transport.onsend——WebStandardStreamableHTTPServerTransport 无此属性）
 *   - 计费 type 用 'mcp_call'（对齐 db schema / shared，非 doc 09 的 spend_mcp）
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { env } from '@/config/env'
import { HttpError } from '@/lib/errors'
import { creditService } from '@/modules/credit/credit.service'
import { postTools, type ToolContext } from '@/ai/tools'

/**
 * 计费包装器：执行工具 handler → 成功才 charge → 返回 MCP 标准结构。
 * - handler 抛 HttpError：转成 { content, isError:true }，🔴 不计费
 * - handler 抛其他异常：转成通用错误，不计费
 * - handler 成功：扣费，返回 { content:[{type:'text', text: JSON.stringify(data)}] }
 */
async function wrapTool<T>(
  toolName: string,
  fn: () => Promise<T>,
  ctx: ToolContext,
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    const data = await fn()
    // 🔴 成功才计费（按次）
    await creditService.charge(
      ctx.userId,
      env.CREDITS_PER_MCP_CALL,
      'mcp_call',
      `MCP ${toolName}（Agent #${ctx.agentId}）`,
    )
    return { content: [{ type: 'text', text: JSON.stringify(data) }] }
  } catch (e) {
    // 业务失败不计费：转 isError 让客户端看到错误
    const message = e instanceof HttpError ? e.message : '工具执行失败'
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
      isError: true,
    }
  }
}

/**
 * 构建一个绑定到具体 Agent 上下文的 McpServer，注册 5 个文章工具。
 * 每请求独立实例（因 ctx 绑定到 apiKeyMiddleware 注入的具体 Agent）。
 */
export function createMcpServer(ctx: ToolContext): McpServer {
  const server = new McpServer({
    name: 'agentblog',
    version: '1.0.0',
  })

  const tools = postTools(ctx)

  // 注册 5 工具：用 registerTool（inputSchema 传 raw shape）；handler 经 wrapTool 包装计费
  server.registerTool('list_posts', {
    description: tools.list_posts.description,
    inputSchema: tools.list_posts.shape,
  }, async (args) => wrapTool('list_posts', () => tools.list_posts.handler(args), ctx))

  server.registerTool('get_post', {
    description: tools.get_post.description,
    inputSchema: tools.get_post.shape,
  }, async (args) => wrapTool('get_post', () => tools.get_post.handler(args), ctx))

  server.registerTool('create_post', {
    description: tools.create_post.description,
    inputSchema: tools.create_post.shape,
  }, async (args) => wrapTool('create_post', () => tools.create_post.handler(args), ctx))

  server.registerTool('update_post', {
    description: tools.update_post.description,
    inputSchema: tools.update_post.shape,
  }, async (args) => wrapTool('update_post', () => tools.update_post.handler(args), ctx))

  server.registerTool('delete_post', {
    description: tools.delete_post.description,
    inputSchema: tools.delete_post.shape,
  }, async (args) => wrapTool('delete_post', () => tools.delete_post.handler(args), ctx))

  server.registerTool('upload_image', {
    description: tools.upload_image.description,
    inputSchema: tools.upload_image.shape,
  }, async (args) => wrapTool('upload_image', () => tools.upload_image.handler(args), ctx))
  return server
}
