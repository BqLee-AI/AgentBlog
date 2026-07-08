/**
 * 在线 Agent 对话路由（详见 docs/design/10 §五）
 *
 * 挂载于 /api/chat（由 routes/index.ts 聚合）：
 *   POST /api/chat —— 流式对话（UI Message / data stream 协议，前端 useChat 消费）
 *
 * 🔴 双鉴权分离：本路由挂 authMiddleware（JWT 用户态），绝不挂 apiKeyMiddleware（X-API-Key 仅供 /mcp）。
 * 🔴 不落库：route 与 runtime 内无任何 db.insert 到对话表（需求 §1.2/§5 强约束）。
 *
 * 请求链路：
 *   authMiddleware（解析 user）
 *   → 预检余额（< 1 → 402，流前拒绝避免无效 LLM 调用）
 *   → 取 user 的 Agent（无 → 400；disabled → 403）
 *   → 校验 messages 非空
 *   → runAgentStream（注入 systemPrompt + 工具，onFinish 扣费）→ toDataStreamResponse
 */
import { Hono } from 'hono'
import type { CoreMessage } from 'ai'
import { HttpError } from '@/lib/errors'
import { authMiddleware } from '@/middlewares/auth'
import { agentService } from '@/modules/agent/agent.service'
import { runAgentStream } from '@/ai/runtime'

export const chatRoutes = new Hono()

// 🔴 用户态 JWT 鉴权（不挂 apiKeyMiddleware，双鉴权分离）
chatRoutes.use('*', authMiddleware)

chatRoutes.post('/', async (c) => {
  const user = c.var.user

  // 1. 预检余额（避免无效 LLM 调用；最终扣费以 onFinish 的 token 为准，v1 宽松允许透支，doc 10 §7.3）
  if (user.credits < 1) {
    throw HttpError.payment('额度不足，无法发起对话')
  }

  // 2. 取用户的 Agent（必须有 Agent 才能对话；systemPrompt 由 runtime 注入）
  const agent = await agentService.getMine(user.id)
  if (!agent) throw HttpError.badRequest('请先创建 Agent')
  if (agent.status === 'disabled') throw HttpError.forbidden('Agent 已停用')

  // 3. 解析 messages（AI SDK 协议；前端维持对话历史发回，后端无状态不落库）
  const body = await c.req.json<{ messages: CoreMessage[] }>()
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw HttpError.badRequest('消息不能为空')
  }

  // 4. 流式运行（onFinish 按 token 扣费）→ 返回 data stream 响应（前端 useChat 消费）
  const result = runAgentStream({
    agent: { id: agent.id, name: agent.name, systemPrompt: agent.systemPrompt },
    userId: user.id,
    messages: body.messages,
  })

  // 🔴 v4 用 toDataStreamResponse（返回 SSE data stream）；不在响应里暴露 systemPrompt
  return result.toDataStreamResponse()
})
