# 07 · Agent 与 API Key 模块

> 本篇实现需求 §4.3「Agent 管理」+ §4.4「API Key 管理」：每用户 ≤1 Agent、System Prompt 配置、Key 签发与吊销、不可逆存储。
> 对应任务 12「Agent 实体 CRUD」+ 任务 13「API Key 签发与吊销」。
>
> **强约束**：每用户最多 1 个 Agent（需求 §4.3）；Key 值不可逆存储（需求 §4.4）。

---

## 一、Agent 模块

### 1.1 接口列表

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| `GET` | `/api/agents/me` | 获取我的 Agent（0 或 1 个） | 登录 |
| `POST` | `/api/agents` | 创建 Agent（每用户 ≤1） | 登录 |
| `PATCH` | `/api/agents/:id` | 更新（名称/头像/System Prompt/状态） | 自己/admin+ |
| `DELETE` | `/api/agents/:id` | 删除 Agent（级联删其 API Key） | 自己/admin+ |

### 1.2 Schema

```ts
// modules/agent/agent.schema.ts
import { z } from 'zod'

export const createAgentSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(50),
  avatarUrl: z.string().url().optional(),
  systemPrompt: z.string().max(8000).optional(),
  status: z.enum(['active', 'disabled']).default('active'),
})

export const updateAgentSchema = createAgentSchema.partial()
```

### 1.3 Service（每用户 ≤1 约束）

```ts
// modules/agent/agent.service.ts
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { agents } from '@/db/schema'
import { HttpError } from '@/lib/errors'
import type { CreateAgentDTO, UpdateAgentDTO } from './agent.schema'

export const agentService = {
  async getMine(userId: number) {
    const rows = await db.select().from(agents).where(eq(agents.userId, userId)).limit(1)
    return rows[0] ?? null
  },

  async create(dto: CreateAgentDTO, userId: number) {
    // 📌 每用户 ≤1
    const existing = await this.getMine(userId)
    if (existing) throw HttpError.conflict('每个用户只能创建 1 个 Agent')

    const [agent] = await db.insert(agents).values({ ...dto, userId }).returning()
    return agent
  },

  async update(agentId: number, dto: UpdateAgentDTO, actor: { id: number; role: string }) {
    const agent = await this._findOrThrow(agentId)
    if (agent.userId !== actor.id && actor.role === 'user') {
      throw HttpError.forbidden('无权操作他人 Agent')
    }
    const [updated] = await db.update(agents).set(dto).where(eq(agents.id, agentId)).returning()
    return updated
  },

  async remove(agentId: number, actor: { id: number; role: string }) {
    const agent = await this._findOrThrow(agentId)
    if (agent.userId !== actor.id && actor.role === 'user') {
      throw HttpError.forbidden('无权删除他人 Agent')
    }
    await db.delete(agents).where(eq(agents.id, agentId))  // 级联删 api_key（外键 cascade）
  },

  async _findOrThrow(id: number) {
    const rows = await db.select().from(agents).where(eq(agents.id, id)).limit(1)
    if (!rows[0]) throw HttpError.notFound('Agent 不存在')
    return rows[0]
  },
}
```

> 💡 约束在 service 层用唯一性查询实现。也可在 DB 加 `UNIQUE(user_id)` 约束双保险（推荐加上）：
> ```ts
> // schema.ts 的 agents 表
> (t) => ({ userUnique: unique('uq_agent_user').on(t.userId) })
> ```

### 1.4 Routes

```ts
// routes/agents.routes.ts
agents
  .use('*', authMiddleware)
  .get('/me', async (c) => ok(c, await agentService.getMine(c.var.user.id)))
  .post('/', zValidator('json', createAgentSchema), async (c) =>
    ok(c, await agentService.create(c.req.valid('json'), c.var.user.id), 201))
  .patch('/:id', zValidator('json', updateAgentSchema), async (c) =>
    ok(c, await agentService.update(Number(c.req.param('id')), c.req.valid('json'), c.var.user)))
  .delete('/:id', async (c) => {
    await agentService.remove(Number(c.req.param('id')), c.var.user)
    return ok(c, { deleted: true })
  })
```

---

## 二、API Key 模块

### 2.1 ⚠️ 不可逆存储的关键设计

需求 §4.4「Key 值，系统生成，**不可逆存储**」。错误做法：明文存库、或对称加密存库（密钥泄露=全完）。正确做法——**存 SHA-256 哈希**，类比密码：

| 步骤 | 处理 |
|------|------|
| 签发 | 生成随机 key → 算 SHA-256 → 存 hash + 前缀（展示用）→ 返回明文（仅此一次） |
| 校验 | 收到 key → 算 SHA-256 → 按 hash 查库 |
| 展示 | 只展示前缀 `sk_live_abcd…`，不显示完整 |
| 吊销 | 更新 status=revoked，不删记录 |

```ts
// lib/crypto.ts
import { createHash, randomBytes } from 'node:crypto'

const PREFIX = 'sk_live_'

/** 生成明文 key（仅签发时返回一次） */
export function generateApiKey(): string {
  return PREFIX + randomBytes(24).toString('hex')  // 48 hex 字符
}

/** 算哈希（存储与查询都用它） */
export function hashApiKey(plain: string): string {
  return createHash('sha256').update(plain).digest('hex')
}

/** 取前缀用于展示识别 */
export function keyPrefix(plain: string): string {
  return plain.slice(0, PREFIX.length + 4) + '…'   // sk_live_abcd…
}
```

### 2.2 接口列表

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| `GET` | `/api/agents/:id/api-keys` | 列出某 Agent 的所有 Key（不含明文） | Agent 主人/admin+ |
| `POST` | `/api/agents/:id/api-keys` | 签发新 Key，返回明文（仅一次） | Agent 主人/admin+ |
| `DELETE` | `/api/api-keys/:id` | 吊销 Key | Key 所属 Agent 主人/admin+ |

### 2.3 Service

```ts
// modules/api-key/api-key.service.ts
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { apiKeys, agents } from '@/db/schema'
import { HttpError } from '@/lib/errors'
import { generateApiKey, hashApiKey, keyPrefix } from '@/lib/crypto'

export const apiKeyService = {
  async listByAgent(agentId: number) {
    return db.select({
      id: apiKeys.id, name: apiKeys.name, keyPrefix: apiKeys.keyPrefix,
      status: apiKeys.status, createdAt: apiKeys.createdAt,
    }).from(apiKeys).where(eq(apiKeys.agentId, agentId))
  },

  async issue(agentId: number, name: string | null, actor: { id: number; role: string }) {
    // 校验 Agent 归属
    const [agent] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1)
    if (!agent) throw HttpError.notFound('Agent 不存在')
    if (agent.userId !== actor.id && actor.role === 'user') {
      throw HttpError.forbidden('无权为他人 Agent 签发 Key')
    }

    const plain = generateApiKey()
    const [row] = await db.insert(apiKeys).values({
      agentId,
      keyHash: hashApiKey(plain),
      keyPrefix: keyPrefix(plain),
      name,
    }).returning()

    // ⚠️ 明文仅此一次返回，之后再也取不到
    return { id: row.id, key: plain, keyPrefix: row.keyPrefix, name: row.name }
  },

  async revoke(keyId: number, actor: { id: number; role: string }) {
    const [key] = await db.select().from(apiKeys).where(eq(apiKeys.id, keyId)).limit(1)
    if (!key) throw HttpError.notFound('Key 不存在')
    // 反查 Agent 归属
    const [agent] = await db.select().from(agents).where(eq(agents.id, key.agentId)).limit(1)
    if (agent?.userId !== actor.id && actor.role === 'user') {
      throw HttpError.forbidden('无权吊销他人 Key')
    }
    await db.update(apiKeys).set({ status: 'revoked' }).where(eq(apiKeys.id, keyId))
  },

  /** MCP 鉴权用：按明文 key 查有效 Key 及其归属用户 */
  async validate(plainKey: string) {
    const hash = hashApiKey(plainKey)
    const [key] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash)).limit(1)
    if (!key || key.status !== 'active') return null
    const [agent] = await db.select().from(agents).where(eq(agents.id, key.agentId)).limit(1)
    if (!agent) return null
    const [user] = await db.select().from(users).where(eq(users.id, agent.userId)).limit(1)
    return user ? { user, agent, key } : null
  },
}
```

### 2.4 Routes

```ts
agentsRoutes
  .use('*', authMiddleware)
  .get('/:id/api-keys', async (c) => {
    // 校验归属略，service 内做
    return ok(c, await apiKeyService.listByAgent(Number(c.req.param('id')), c.var.user))
  })
  .post('/:id/api-keys', zValidator('json', z.object({ name: z.string().max(50).optional() })), async (c) => {
    const { name } = c.req.valid('json')
    return ok(c, await apiKeyService.issue(Number(c.req.param('id')), name ?? null, c.var.user), 201)
  })

apiKeysRoutes
  .use('*', authMiddleware)
  .delete('/:id', async (c) => {
    await apiKeyService.revoke(Number(c.req.param('id')), c.var.user)
    return ok(c, { revoked: true })
  })
```

## 三、MCP 鉴权中间件（Header API Key）

> 📌 需求 §4.6：MCP 请求头携带 API Key。这里实现鉴权 + 注入用户。

```ts
// middlewares/api-key.ts
import type { MiddlewareHandler } from 'hono'
import { apiKeyService } from '@/modules/api-key/api-key.service'
import { HttpError } from '@/lib/errors'

export interface ApiKeyVars {
  apiKeyUser: { id: number; username: string; credits: number }
  apiKeyAgent: { id: number; name: string; userId: number }
  apiKeyId: number
}

export const apiKeyMiddleware: MiddlewareHandler = async (c, next) => {
  const key = c.req.header('X-API-Key')  // 需求指定 Header 携带
  if (!key) throw HttpError.unauthorized('缺少 API Key')

  const result = await apiKeyService.validate(key)
  if (!result) throw HttpError.unauthorized('API Key 无效或已吊销')

  c.set('apiKeyUser', { id: result.user.id, username: result.user.username, credits: result.user.credits })
  c.set('apiKeyAgent', { id: result.agent.id, name: result.agent.name, userId: result.agent.userId })
  c.set('apiKeyId', result.key.id)
  await next()
}

declare module 'hono' {
  interface ContextVariableMap extends ApiKeyVars {}
}
```

> 💡 Key 存哪个 header？需求说「请求头携带」，约定用 `X-API-Key`（MCP 客户端易配置）。也可用 `Authorization: Bearer`，二选一在团队内统一。

## 四、接口契约示例

### `POST /api/agents/:id/api-keys`（签发）

```jsonc
// res 201 —— 明文 key 仅此一次！
{
  "ok": true,
  "data": {
    "id": 7,
    "key": "sk_live_3f9a2b1c...48hex",
    "keyPrefix": "sk_live_3f9a…",
    "name": "我的本地客户端"
  }
}
```

> ⚠️ 前端必须在此刻提示用户保存 key，关闭后无法找回。

### `GET /api/agents/:id/api-keys`（列出）

```jsonc
// 不含明文
{
  "ok": true,
  "data": [
    { "id": 7, "keyPrefix": "sk_live_3f9a…", "name": "我的本地客户端", "status": "active" },
    { "id": 8, "keyPrefix": "sk_live_b7c1…", "name": null, "status": "revoked" }
  ]
}
```

## 五、验收用例（对应 TC-003/TC-008）

| 用例 | 操作 | 预期 |
|------|------|------|
| TC-003 建第 2 个 Agent | POST /agents 二次 | 409「每个用户只能创建 1 个 Agent」 |
| TC-008 无 Key 调 MCP | 不带 X-API-Key | 401 |
| TC-008b 吊销后调 MCP | revoked key | 401 |
| TC 签发后无法找回 | 签发后 GET 列表 | 只见 prefix，无明文 |
| TC 删 Agent 级联 | DELETE agent | 其下 api_key 自动删 |

## 六、本篇交付物清单（D3）

- [ ] Agent CRUD + 每用户≤1 约束（DB 唯一约束 + service 双保险）
- [ ] API Key 签发/吊销/列表，不可逆存储（SHA-256）
- [ ] `apiKeyMiddleware` 完成，供 MCP 使用
- [ ] 签发响应只返回一次明文，前端有保存提示

---

**下一篇**：[08 · Credits 计费与原子扣减](./08-Credits-计费与原子扣减.md)
