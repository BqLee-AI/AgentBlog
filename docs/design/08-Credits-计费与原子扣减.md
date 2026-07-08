# 08 · Credits 计费与原子扣减

> 本篇实现需求 §4.5「Credits 与计费」：原子扣减、防超扣、流水审计、余额不足返回 **402**。
> 对应任务 14「Credits 计费与扣减（原子化）+ 流水」。
>
> **强约束**：扣减原子化防超扣（需求 §4.5）；余额不足返回 402（需求 §4.5）；流水可审计（需求 §4.5）。

---

## 一、计费场景总览

| 场景 | 计量 | 单价 | 扣谁 | 触发点 |
|------|------|------|------|--------|
| MCP 调用 | 每次成功调用 1 次 | `CREDITS_PER_MCP_CALL`（默认 1） | API Key 对应用户 | MCP 工具 dispatch 后（见 09） |
| 在线 Agent | LLM Token 数 | `TOKENS_PER_CREDIT`（默认 1000 token = 1 credit） | Agent 主人 | 流式结束后（见 10） |
| 充值 | 管理员发放 | — | 目标用户 | admin 调 `/credits/recharge` |

> 💡 单价放配置（`env`），不写死，便于调价。

## 二、⚠️ 并发超扣问题

朴素实现「查余额 → 判断 → 扣减」在并发下会超扣：

```
T1: SELECT credits WHERE id=5       → 100
T2: SELECT credits WHERE id=5       → 100   (T1 还没扣)
T1: UPDATE credits = 100 - 80        → 20
T2: UPDATE credits = 100 - 50        → 50   ❌ 应为 -30
```

## 三、原子扣减方案（条件 UPDATE）

用一条带条件的 UPDATE 保证原子性，**只有余额足够时才更新**：

```ts
// modules/credit/credit.service.ts
import { eq, and, gte, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { users, creditLogs } from '@/db/schema'
import { env } from '@/config/env'
import { HttpError } from '@/lib/errors'

export type CreditType = 'recharge' | 'spend_mcp' | 'spend_token'

export const creditService = {
  /**
   * 原子扣减。返回是否成功。
   * - 余额足够：UPDATE ... WHERE credits >= amount，返回 true
   * - 余额不足：UPDATE 影响 0 行，返回 false
   */
  async tryDeduct(
    userId: number,
    amount: number,
    type: CreditType,
    reason: string,
  ): Promise<boolean> {
    if (amount <= 0) return true

    return db.transaction(async (tx) => {
      // 关键：条件 UPDATE，行级原子
      const updated = await tx
        .update(users)
        .set({ credits: sql`${users.credits} - ${amount}` })
        .where(and(eq(users.id, userId), gte(users.credits, amount)))
        .returning({ id: users.id })

      if (updated.length === 0) return false   // 余额不足

      // 写流水（delta 负数）
      await tx.insert(creditLogs).values({
        userId,
        delta: -amount,
        type,
        reason,
      })
      return true
    })
  },

  /** 扣减，余额不足直接抛 402（调用方常用） */
  async charge(userId: number, amount: number, type: CreditType, reason: string) {
    const ok = await this.tryDeduct(userId, amount, type, reason)
    if (!ok) {
      // 📌 需求指定 402
      throw new HttpError(402, 'INSUFFICIENT_CREDITS', '额度不足，请联系管理员充值')
    }
  },

  /** 管理员充值 */
  async recharge(userId: number, amount: number, reason: string, actorId: number) {
    return db.transaction(async (tx) => {
      await tx.update(users)
        .set({ credits: sql`${users.credits} + ${amount}` })
        .where(eq(users.id, userId))
      await tx.insert(creditLogs).values({
        userId, delta: amount, type: 'recharge',
        reason: `${reason}（操作人 #${actorId}）`,
      })
    })
  },

  /** 查流水 */
  async logs(userId: number, page: number, pageSize: number) {
    const offset = (page - 1) * pageSize
    const items = await db.query.creditLogs.findMany({
      where: eq(creditLogs.userId, userId),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit: pageSize, offset,
    })
    return { items, page, pageSize }
  },

  /** 计算在线 Agent 的 token → credits 换算 */
  tokensToCredits(totalTokens: number): number {
    return Math.ceil(totalTokens / env.TOKENS_PER_CREDIT)
  },
}
```

### 3.1 为什么条件 UPDATE 是原子的？

SQLite 的 UPDATE 是语句级原子的，且默认 SERIALIZABLE 隔离。`WHERE credits >= amount` 在数据库引擎内部判断，不会出现「两个事务都读到 100」的交错。配合 WAL 模式（见 03），写入会序列化。

### 3.2 预检（可选，优化体验）

流式对话开始前可预检余额 > 0，给前端更早的反馈，但**最终扣减仍以 tryDeduct 为准**：

```ts
if (user.credits <= 0) throw HttpError.payment('额度不足')
// ... 流式 ...
// 流式结束后真正扣减
```

## 四、402 错误处理

需求明确余额不足返回 402。在错误码体系（见 12）中加：

```ts
// lib/errors.ts
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) { super(message) }

  static payment(msg = '额度不足') { return new HttpError(402, 'INSUFFICIENT_CREDITS', msg) }
  // ... 其他静态方法
}
```

`app.onError` 会自动转成：

```json
{ "ok": false, "error": { "code": "INSUFFICIENT_CREDITS", "message": "额度不足" } }
```

## 五、计费嵌入点

### 5.1 MCP 按次计费（详见 09）

```ts
// mcp/server.ts —— 工具调用成功后
await creditService.charge(
  c.var.apiKeyUser.id,
  env.CREDITS_PER_MCP_CALL,
  'spend_mcp',
  `MCP ${toolName}`,
)
```

> 💡 哪些算「成功」？建议：工具执行未抛异常即计费。读类工具（list/get）也计费，与需求「每次成功调用计 1 次」一致。

### 5.2 在线 Agent Token 计费（详见 10）

```ts
// ai/runtime.ts —— streamText 的 onFinish 回调
onFinish: async ({ usage }) => {
  const credits = creditService.tokensToCredits(usage.totalTokens)
  await creditService.charge(userId, credits, 'spend_token', `在线对话 ${model}`)
}
```

> 💡 `usage.totalTokens` 由 Vercel AI SDK 的 provider 返回，含 prompt + completion。

## 六、充值接口（admin）

```ts
// routes/credits.routes.ts
credits
  .use('*', authMiddleware)
  .post('/recharge', requireRole('admin', 'super_admin'),
    zValidator('json', z.object({ userId: z.number().int().positive(), amount: z.number().int().positive(), reason: z.string().default('手动充值') })),
    async (c) => {
      const { userId, amount, reason } = c.req.valid('json')
      await creditService.recharge(userId, amount, reason, c.var.user.id)
      return ok(c, { recharged: true })
    },
  )
  .get('/me/logs', zValidator('query', z.object({ page: z.coerce.number().default(1), pageSize: z.coerce.number().default(20) })),
    async (c) => ok(c, await creditService.logs(c.var.user.id, /* page, pageSize */))),
  .get('/logs/:userId', requireRole('admin', 'super_admin'), async (c) =>
    ok(c, await creditService.logs(Number(c.req.param('userId')), /* page, pageSize */))),
```

## 七、流水审计

`credit_log` 表记录每笔变动，满足需求「流水可审计」：

| id | user_id | delta | type | reason | created_at |
|----|---------|-------|------|--------|------------|
| 1 | 5 | +100000 | recharge | 初始化（操作人 #1） | … |
| 2 | 5 | -1 | spend_mcp | MCP list_posts | … |
| 3 | 5 | -3 | spend_token | 在线对话 gpt-4o-mini (3120 tokens) | … |

## 八、验收用例（对应 TC-005/TC-007）

| 用例 | 操作 | 预期 |
|------|------|------|
| TC-007 余额不足调 MCP | credits=0 时调 | 402 `INSUFFICIENT_CREDITS` |
| TC-005 带 Key 调 list_posts | 充足余额 | 200，扣 1，流水 +1 行 delta=-1 |
| 并发安全 | 并发 100 个 MCP 请求，余额 50 | 至多 50 个成功，无负数 |
| Token 计费 | 对话用 3120 tokens | 扣 ceil(3120/1000)=4 credits |
| 充值 | admin 充 100 | credits +100，流水 delta=+100 |

### 并发测试脚本

```ts
// tests/credit.concurrency.test.ts
import { describe, it, expect } from 'bun:test'
import { creditService } from '@/modules/credit/credit.service'

describe('credits 并发安全', () => {
  it('余额 50 时并发 100 次扣减，应只成功 50 次', async () => {
    // 准备：给 user 6 充 50
    await creditService.recharge(6, 50, '并发测试', 1)
    const results = await Promise.all(
      Array.from({ length: 100 }, () =>
        creditService.tryDeduct(6, 1, 'spend_mcp', '并发').catch(() => false),
      ),
    )
    const success = results.filter(Boolean).length
    expect(success).toBe(50)
  })
})
```

## 九、本篇交付物清单（D3）

- [ ] `creditService.charge` / `tryDeduct` / `recharge` 完成，条件 UPDATE 原子化
- [ ] 402 错误码 `INSUFFICIENT_CREDITS` 接入 errorHandler
- [ ] 流水写入正常，可审计
- [ ] 并发测试通过（无超扣）
- [ ] 与李钊确认：MCP 与在线 Agent 两个计费点都接好

---

**下一篇**：[09 · MCP Server 实现](./09-MCP-Server-实现.md)
