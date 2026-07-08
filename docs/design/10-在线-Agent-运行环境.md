# 10 · 在线 Agent 运行环境

> 本篇实现需求 §4.5/§2.2.3 形态 A：平台在线运行 Agent，基于 Vercel AI SDK 流式对话，按 Token 计费，**不持久化聊天记录**。
> 对应任务 16「在线运行环境（AI SDK 流式）」。
>
> **强约束**：流式（UI Message 协议）；按 LLM Token 计费；**不存聊天记录**（需求 §1.2/§5）；注入 Agent 的 System Prompt 与内置工具。

---

## 一、与 MCP 的关系

| 维度 | 在线 Agent（本文） | MCP（09） |
|------|--------------------|-----------|
| 谁调用 | 人在前端用 useChat | 外部 Agent 客户端 |
| 鉴权 | JWT（用户态） | Header API Key |
| 工具集 | **同一套** `ai/tools.ts` | 同一套 |
| System Prompt | 注入用户自己 Agent 的 prompt | 不注入（客户端自带） |
| 计费 | 按 Token | 按次 |
| 持久化 | ❌ 不存 | ❌ 不存（按需求） |

> 💡 关键复用：工具定义 `ai/tools.ts` 两边共用（需求 §4.6「工具集与平台在线 Agent 内置工具一致」）。

## 二、依赖

```bash
bun add ai @ai-sdk/openai     # 或 @ai-sdk/anthropic 按 env.AI_PROVIDER
```

## 三、流式协议：UI Message（Vercel AI SDK Data Stream）

需求 §2.5「采用 Vercel AI SDK 推荐的流式 UI Message 方案」。前端用 `useChat`，后端用 `streamText` + `toDataStreamResponse`（或 v4 的 `toUIMessageStreamResponse`）。

```
前端 useChat (POST /api/chat)
   │  body: { messages: [...] }
   ▼
Hono chat 路由
   ├─ authMiddleware（解析 user）
   ├─ 取 user 的 Agent（systemPrompt + 工具）
   ├─ streamText({ model, system, messages, tools, onFinish })
   └─ 返回 data stream（SSE 形态）
```

## 四、AI 运行时（`src/ai/runtime.ts`）

```ts
import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { env } from '@/config/env'
import { postTools } from './tools'
import { creditService } from '@/modules/credit/credit.service'
import type { Agent } from '@/db/schema'

function getModel() {
  if (env.AI_PROVIDER === 'openai') {
    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY })
    return openai(env.AI_MODEL)
  }
  throw new Error(`不支持的 provider: ${env.AI_PROVIDER}`)
}

export interface RunOptions {
  agent: Pick<Agent, 'id' | 'systemPrompt' | 'name'>
  userId: number
  messages: any[]   // AI SDK 的 messages 结构
}

/**
 * 运行在线 Agent，返回流式 Response。
 * 计费在 onFinish 回调里做（按实际 Token）。
 */
export function runAgentStream({ agent, userId, messages }: RunOptions) {
  // 把 Agent 配置 + 工具上下文打包
  const toolsMap = postTools({ agentId: agent.id, userId, role: 'user' })

  return streamText({
    model: getModel(),
    system: agent.systemPrompt || `你是 ${agent.name}，一个运行在 AgentBlog 上的助手。`,
    messages,
    // 转成 AI SDK 的 tool 定义（详见 4.1）
    tools: toAiSdkTools(toolsMap),

    // 📌 流结束后按实际 Token 计费
    onFinish: async ({ usage }) => {
      const credits = creditService.tokensToCredits(usage.totalTokens)
      if (credits > 0) {
        await creditService.charge(userId, credits, 'spend_token',
          `在线对话 ${env.AI_MODEL}（${usage.totalTokens} tokens）`)
      }
    },
  })
}
```

### 4.1 把工具转成 AI SDK 格式

AI SDK 的 `tool()` 接受 `{ description, parameters: ZodSchema, execute }`：

```ts
// ai/tools.ts 追加
import { tool as aiTool } from 'ai'

export function toAiSdkTools(defs: ReturnType<typeof postTools>) {
  return {
    list_posts: aiTool({
      description: defs.list_posts.description,
      parameters: defs.list_posts.inputSchema,
      execute: defs.list_posts.handler,
    }),
    get_post: aiTool({ description: defs.get_post.description, parameters: defs.get_post.inputSchema, execute: defs.get_post.handler }),
    create_post: aiTool({ description: defs.create_post.description, parameters: defs.create_post.inputSchema, execute: defs.create_post.handler }),
    update_post: aiTool({ description: defs.update_post.description, parameters: defs.update_post.inputSchema, execute: defs.update_post.handler }),
    delete_post: aiTool({ description: defs.delete_post.description, parameters: defs.delete_post.inputSchema, execute: defs.delete_post.handler }),
  }
}
```

## 五、Chat 路由（`src/routes/chat.routes.ts`）

```ts
import { Hono } from 'hono'
import { authMiddleware } from '@/middlewares/auth'
import { agentService } from '@/modules/agent/agent.service'
import { creditService } from '@/modules/credit/credit.service'
import { env } from '@/config/env'
import { runAgentStream } from '@/ai/runtime'
import { HttpError } from '@/lib/errors'

export const chat = new Hono()

chat.use('*', authMiddleware)

chat.post('/', async (c) => {
  const user = c.var.user

  // 1. 预检余额（避免无效 LLM 调用）
  if (user.credits < 1) {
    throw HttpError.payment('额度不足，无法发起对话')
  }

  // 2. 取用户的 Agent（必须有 Agent 才能对话）
  const agent = await agentService.getMine(user.id)
  if (!agent) throw HttpError.badRequest('请先创建 Agent')
  if (agent.status === 'disabled') throw HttpError.forbidden('Agent 已停用')

  // 3. 解析 messages（AI SDK 协议）
  const body = await c.req.json<{ messages: any[] }>()
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw HttpError.badRequest('消息不能为空')
  }

  // 4. 流式运行
  const result = runAgentStream({ agent, userId: user.id, messages: body.messages })

  // 5. 返回 data stream 响应（useChat 消费）
  return result.toUIMessageStreamResponse({ headers: { 'X-Request-Id': c.var.requestId } })
})
```

> 💡 `toUIMessageStreamResponse()`（AI SDK v5）或 `toDataStreamResponse()`（v3/v4）返回的是 SSE 流，前端 `useChat` 直接消费。

## 六、📌 不持久化聊天记录

需求 §1.2/§5 明确「在线 Agent 不持久化聊天记录，关闭即清」。本系统**完全不建 message 表**：

- `streamText` 的 `messages` 来自请求体（前端在内存/会话存储中维持）
- 后端不写任何 message 落库
- 前端关闭页面/刷新即丢失对话（前端职责，文档约定）

```ts
// ⚠️ 禁止出现以下代码：
// await db.insert(messages).values(...)
// await db.insert(conversation).values(...)
```

> 💡 如未来扩展持久化（需求 §8 列为后续），再加 `conversation` + `message` 表，但 v1 不做。

## 七、流式计费的边界处理

### 7.1 计费时机

`onFinish` 在流正常结束时触发，含完整 `usage`。这是计费的可靠时机。

### 7.2 异常情况

| 情况 | 处理 |
|------|------|
| 用户中途关闭连接 | `onFinish` 可能不触发；可加 `onError` 兜底，按已产生 token 估算扣费 |
| LLM 报错 | `onError` 触发，不计费（未消耗服务） |
| 工具调用失败 | 不影响 token 计费，仍按 prompt+completion 扣 |

> 💡 v1 简化处理：只信任 `onFinish`，异常不计费。极端情况损失少量 credit，可接受。

### 7.3 防止预检后透支

预检只看 `credits >= 1`，但一次对话可能消耗远超 1 credit。两种策略：
- **宽松**：允许透支，下次对话被挡（用户体验好）
- **严格**：预留额度上限（如设单次对话上限 credits）

```ts
// 严格策略示例：设单次上限
const MAX_PER_CHAT = 20
if (user.credits > MAX_PER_CHAT) {
  // 允许
} else {
  // 提示余额不足以支撑一次完整对话
}
```

需求未明确，建议 v1 用宽松策略 + 流后扣费。

## 八、前端对接（交付给黄宇超）

```ts
// 前端 useChat 配置
import { useChat } from '@ai-sdk/react'

const { messages, input, handleSubmit } = useChat({
  api: '/api/chat',
  headers: { Authorization: `Bearer ${token}` },
})
```

- 前端把整段对话历史放 `messages` 里发回（后端无状态）
- 关闭页面即丢，符合「不存记录」

## 九、System Prompt 注入

需求 §1.2「注入 System Prompt」。`runAgentStream` 已把 `agent.systemPrompt` 作为 `system` 传入。用户在 Agent 管理页配置（见 07），对话时自动生效。

> 💡 安全提示：不要把 system prompt 暴露给对话流返回，避免 prompt 注入攻击泄露。

## 十、验收用例（对应 TC-004）

| 用例 | 操作 | 预期 |
|------|------|------|
| TC-004 流式对话 | POST /api/chat | SSE 流式输出 UI Message，结束扣 token 对应 credits |
| TC-004b 不存记录 | 对话后查库 | 无任何 message/conversation 记录 |
| TC 无 Agent 对话 | 未创建 Agent 就 POST | 400「请先创建 Agent」 |
| TC Agent 停用 | status=disabled | 403 |
| TC 余额不足 | credits=0 | 402 |
| TC 工具调用 | 让 Agent 调 list_posts | Agent 能读到文章，工具结果回到流 |

## 十一、本篇交付物清单（D3）

- [ ] `POST /api/chat` 流式响应，前端 useChat 能正常显示
- [ ] System Prompt 从用户 Agent 注入
- [ ] 5 个内置工具在对话中可被 LLM 调用
- [ ] `onFinish` 按 token 扣 credits + 写流水
- [ ] **确认无任何 message 落库**（代码 review）
- [ ] 与黄宇东联调 useChat 流式消费

---

**下一篇**：[11 · 图片上传与存储](./11-图片上传与存储.md)
