# 09 · MCP Server 实现

> 本篇实现需求 §4.6「MCP 接口」：系统作为 MCP Server 暴露文章 CRUD 工具，Header API Key 鉴权，按次计费。
> 对应任务 15「MCP Server（文章 CRUD 工具 + Header 鉴权）」。
>
> **强约束**：5 个文章工具（list/get/create/update/delete）；Header API Key 鉴权；按次计费；作者归属为该 Agent。

---

## 一、MCP 协议与传输

MCP（Model Context Protocol）基于 **JSON-RPC 2.0**。本系统作为 **Server**，向外部 Agent 客户端暴露 tools。

传输方式选择：
- **HTTP + SSE（Streamable HTTP）**：现代 MCP 推荐传输，适合远程服务。官方 SDK 提供 `McpServer` + `StreamableHTTPServerTransport`。
- 本系统用 Hono 挂载 `/mcp` 端点，承载该 transport。

```
外部 Agent (MCP 客户端)
   │  JSON-RPC: tools/list, tools/call
   │  Header: X-API-Key: sk_live_xxx
   ▼
Hono app
   ├─ apiKeyMiddleware（解析 Key → 注入 user/agent）
   ├─ credits 预检 + 计费
   └─ McpServer.transport(StreamableHTTP)
         └─ tools: list_posts / get_post / create_post / update_post / delete_post
```

## 二、安装与依赖

```bash
bun add @modelcontextprotocol/sdk
```

> 💡 MCP 官方 TS SDK 自带 server 实现与传输层，无需自己手写 JSON-RPC。

## 三、工具集（与在线 Agent 内置工具共用）

> 📌 需求 §4.6：MCP 工具集与平台在线 Agent 内置工具一致。所以工具定义放一处，两边复用（见 [10](./10-在线-Agent-运行环境.md)）。

```ts
// src/ai/tools.ts —— 工具定义（MCP 与在线 Agent 共用）
import { z } from 'zod'

/**
 * 工具上下文：执行时知道"我是哪个 Agent"，用于作者归属与权限。
 * MCP 场景由 apiKeyMiddleware 填充；在线场景由 chat 路由填充。
 */
export interface ToolContext {
  agentId: number
  userId: number   // Agent 主人
  role: 'user' | 'admin' | 'super_admin'
}

export const postTools = (ctx: ToolContext) => ({
  list_posts: {
    description: '按标签/状态列出文章。默认只返回已发布文章。',
    inputSchema: z.object({
      tag: z.string().optional().describe('标签 slug 过滤'),
      status: z.enum(['draft', 'published']).optional().describe('默认 published'),
      limit: z.number().int().min(1).max(50).default(10),
      offset: z.number().int().min(0).default(0),
    }),
    handler: async (args: { tag?: string; status?: string; limit: number; offset: number }) => {
      return postService.list({
        page: Math.floor(args.offset / args.limit) + 1,
        pageSize: args.limit,
        tag: args.tag,
        status: (args.status as 'draft' | 'published') ?? 'published',
        authorType: undefined,
        authorId: undefined,
      }, true)
    },
  },

  get_post: {
    description: '按 slug 或 id 读取文章详情。',
    inputSchema: z.object({
      slug: z.string().optional(),
      id: z.number().int().positive().optional(),
    }).refine((d) => d.slug || d.id, { message: 'slug 或 id 至少一个' }),
    handler: async (args: { slug?: string; id?: number }) => {
      if (args.slug) return postService.getBySlug(args.slug)
      const p = await postRepository.findById(args.id!)
      if (!p) throw HttpError.notFound('文章不存在')
      return p
    },
  },

  create_post: {
    description: '创建文章，作者自动归属为当前 Agent。',
    inputSchema: z.object({
      title: z.string().min(1),
      content: z.string().min(1),
      summary: z.string().optional(),
      status: z.enum(['draft', 'published']).default('published'),
      coverUrl: z.string().url().optional(),
      tagIds: z.array(z.number().int().positive()).default([]),
    }),
    // 📌 作者归属为该 Agent
    handler: async (args: any) => postService.create(args, ctx.agentId, 'agent'),
  },

  update_post: {
    description: '更新文章内容/状态（slug 不可改）。',
    inputSchema: z.object({
      id: z.number().int().positive(),
      title: z.string().optional(),
      content: z.string().optional(),
      summary: z.string().optional(),
      status: z.enum(['draft', 'published']).optional(),
      coverUrl: z.string().url().optional(),
      tagIds: z.array(z.number().int().positive()).optional(),
    }),
    handler: async (args: any) => {
      const { id, ...rest } = args
      return postService.update(id, rest, { id: ctx.userId, role: ctx.role })
    },
  },

  delete_post: {
    description: '删除文章。',
    inputSchema: z.object({ id: z.number().int().positive() }),
    handler: async (args: { id: number }) =>
      postService.remove(args.id, { id: ctx.userId, role: ctx.role }),
  },
})
```

## 四、MCP Server 搭建（`src/mcp/server.ts`）

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { postTools, type ToolContext } from '@/ai/tools'

/**
 * 每个请求构建一个独立的 McpServer 实例（因为工具上下文绑定到具体 API Key 对应的 Agent）。
 */
export function createMcpServer(ctx: ToolContext): McpServer {
  const server = new McpServer({
    name: 'agentblog',
    version: '1.0.0',
  })

  const tools = postTools(ctx)
  // 注册工具
  server.tool(
    'list_posts',
    tools.list_posts.description,
    tools.list_posts.inputSchema.shape,    // MCP SDK 接受 zod raw shape
    async (args) => ({ content: [{ type: 'text', text: JSON.stringify(await tools.list_posts.handler(args)) }] }),
  )
  server.tool('get_post', tools.get_post.description, tools.get_post.inputSchema.shape,
    async (args) => ({ content: [{ type: 'text', text: JSON.stringify(await tools.get_post.handler(args)) }] }))
  server.tool('create_post', tools.create_post.description, tools.create_post.inputSchema.shape,
    async (args) => ({ content: [{ type: 'text', text: JSON.stringify(await tools.create_post.handler(args)) }] }))
  server.tool('update_post', tools.update_post.description, tools.update_post.inputSchema.shape,
    async (args) => ({ content: [{ type: 'text', text: JSON.stringify(await tools.update_post.handler(args)) }] }))
  server.tool('delete_post', tools.delete_post.description, tools.delete_post.inputSchema.shape,
    async (args) => ({ content: [{ type: 'text', text: JSON.stringify(await tools.delete_post.handler(args)) }] }))

  return server
}
```

> 💡 MCP 工具返回必须是 `{ content: [{ type: 'text', text }] }` 结构，把业务 JSON 序列化进 text。Agent 客户端会拿到这段 text。

## 五、挂到 Hono（`src/mcp/handler.ts`）

> 📌 这一段是关键：每个 MCP 请求要：
> 1. 解析 API Key（apiKeyMiddleware）
> 2. 预检 credits
> 3. 调用工具
> 4. 成功后按次计费

```ts
import { Hono } from 'hono'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { apiKeyMiddleware } from '@/middlewares/api-key'
import { creditService } from '@/modules/credit/credit.service'
import { env } from '@/config/env'
import { createMcpServer } from './server'
import { HttpError } from '@/lib/errors'

export const mcpHandler = new Hono()

// 所有 /mcp/* 都要 API Key
mcpHandler.use('*', apiKeyMiddleware)

// MCP 单端点（POST 为 RPC 调用，GET 为 SSE，DELETE 关闭会话）
mcpHandler.all('/', async (c) => {
  const actor = c.var.apiKeyUser
  const agent = c.var.apiKeyAgent

  // 预检：余额 > 0 才放行（避免无效扣费）
  if (actor.credits < env.CREDITS_PER_MCP_CALL) {
    throw HttpError.payment('额度不足，无法调用 MCP')
  }

  const server = createMcpServer({
    agentId: agent.id,
    userId: actor.id,
    role: 'user',   // API Key 通道按用户身份
  })

  // 用 transport 处理请求；通过 hook 在每次工具调用成功后计费
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,  // 无状态模式，简单可靠
  })

  // 包装计费：在 tool 执行后扣费
  transport.onsend = async (response) => {
    // 只对 tools/call 的成功结果计费
    if (response?.result && !(response.result as any).error) {
      await creditService.charge(
        actor.id,
        env.CREDITS_PER_MCP_CALL,
        'spend_mcp',
        `MCP 调用（Agent #${agent.id}）`,
      ).catch(() => {/* 计费失败不阻断响应，记日志 */})
    }
  }

  await server.connect(transport)
  // 把 Hono 的 Request 交给 transport
  const mcpResponse = await transport.handleRequest(c.req.raw)
  return mcpResponse
})
```

> ⚠️ 计费时机与方式是本模块最易出错处。三种策略可选：
> - **A. 每次工具调用后计**（推荐）：粒度准确，与需求「按工具调用次数」一致。需用 transport hook 或在工具 handler 内包一层。
> - **B. 每次 RPC 请求计**：简单但 tools/list 也计费，不合理。
> - **C. 在 handler 内包**：更可控，见下文「计费包装器」方案。

### 5.1 计费包装器（替代方案，更明确）

把计费逻辑包进工具执行，而不是依赖 transport hook：

```ts
// mcp/server.ts 内，注册时包装
async function withBilling<T>(actorId: number, toolName: string, fn: () => Promise<T>): Promise<T> {
  const result = await fn()
  // 成功才计费
  await creditService.charge(actorId, env.CREDITS_PER_MCP_CALL, 'spend_mcp', `MCP ${toolName}`)
  return result
}

server.tool('list_posts', /* ... */, async (args) => {
  const data = await withBilling(ctx.userId, 'list_posts', () => tools.list_posts.handler(args))
  return { content: [{ type: 'text', text: JSON.stringify(data) }] }
})
```

> 💡 推荐用包装器方案，逻辑清晰、易测试。`transport.onsend` 方案作为兜底。

## 六、客户端配置示例（交付给用户）

用户拿到 API Key 后，在本地 MCP 客户端（如 Claude Desktop）配置：

```jsonc
// claude_desktop_config.json
{
  "mcpServers": {
    "agentblog": {
      "url": "https://your-domain.com/mcp",
      "headers": {
        "X-API-Key": "sk_live_xxx"
      }
    }
  }
}
```

或使用 `@modelcontextprotocol/sdk` 写自定义客户端：

```ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const transport = new StreamableHTTPClientTransport(
  new URL('https://your-domain.com/mcp'),
  { requestInit: { headers: { 'X-API-Key': 'sk_live_xxx' } } },
)
const client = new Client({ name: 'my-agent', version: '1.0.0' })
await client.connect(transport)

const posts = await client.callTool({ name: 'list_posts', arguments: { limit: 5 } })
```

## 七、错误处理

MCP 工具内抛的 `HttpError` 需要 MCP 客户端能看到。两种方式：
1. **返回 isError 标记**（推荐）：`{ content: [...], isError: true }`
2. 返回错误 JSON 作为 text

```ts
server.tool('get_post', /* ... */, async (args) => {
  try {
    const data = await tools.get_post.handler(args)
    return { content: [{ type: 'text', text: JSON.stringify(data) }] }
  } catch (e) {
    const msg = e instanceof HttpError ? e.message : '工具执行失败'
    return { content: [{ type: 'text', text: JSON.stringify({ error: msg }) }], isError: true }
  }
})
```

> 💡 鉴权失败（401）与余额不足（402）发生在 middleware 层，直接返回 HTTP 错误，不进入 MCP 工具。

## 八、验收用例（对应 TC-005/TC-006/TC-008）

| 用例 | 操作 | 预期 |
|------|------|------|
| TC-005 带 Key 调 list_posts | tools/call list_posts | 返回文章列表 JSON，扣 1 credit，流水 +1 |
| TC-006 Agent 经 MCP 创建文章 | tools/call create_post | 文章 author_type=agent，author_id=该 Agent |
| TC-008 无 Key 调 MCP | 不带 header | HTTP 401 |
| TC-008b Key 吊销 | revoked key | HTTP 401 |
| TC 余额不足 | credits=0 | HTTP 402 |
| TC update_post 改 slug | 传 slug 字段 | 忽略 slug，返回原 slug |

## 九、联调清单（见 13）

- [ ] 用官方 MCP Inspector 连上 `/mcp`，能看到 5 个工具
- [ ] tools/list 返回 5 个工具的 schema
- [ ] 每个 tools/call 都按次扣费
- [ ] 无效 Key / 余额不足的 HTTP 错误正确

```bash
# 用官方 inspector 快速测试
npx @modelcontextprotocol/inspector \
  --transport http \
  --url http://localhost:3000/mcp \
  --header "X-API-Key: sk_live_xxx"
```

## 十、本篇交付物清单（D3）

- [ ] `/mcp` 端点跑通，MCP Inspector 能列工具并调用
- [ ] 5 个文章工具全部接 postService
- [ ] create_post 作者自动归属调用方 Agent
- [ ] 每次成功 tools/call 扣 1 credit + 写流水
- [ ] 鉴权与计费错误返回正确 HTTP 状态码
- [ ] 工具定义与在线 Agent 共用 `ai/tools.ts`

---

**下一篇**：[10 · 在线 Agent 运行环境](./10-在线-Agent-运行环境.md)
