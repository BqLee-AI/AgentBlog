/**
 * 🔴 Credits 并发安全测试（详见 docs/design/08 §八）
 *
 * 计费可信度的唯一证明：
 *   余额 50 时并发 100 次扣减 1，断言成功数 = 50、余额不为负。
 *
 * 用独立临时 db 隔离（issue #24），不污染 dev 库。
 * 运行：bun test apps/api/tests/credit.concurrency.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { eq } from 'drizzle-orm'
import { setupTestDb, cleanupTestDb, type TestContext } from './helpers/setup'
import { createUser } from './helpers/factory'

let ctx: TestContext
let testUserId: number

beforeAll(async () => {
  ctx = await setupTestDb()
  const { user } = await createUser(ctx.db, { credits: 0 })
  testUserId = user.id
})

afterAll(async () => {
  await cleanupTestDb(ctx.dbPath)
})

describe('credits 并发安全', () => {
  it('余额 50 时并发 100 次扣减，应只成功 50 次', async () => {
    const { creditService } = await import('@/modules/credit/credit.service')
    const { users } = await import('@/db/schema')
    const { db } = ctx

    // 准备：重置到 0 再充 50（精确值）
    await db.update(users).set({ credits: 0 }).where(eq(users.id, testUserId))
    await creditService.recharge(testUserId, 50, '并发测试准备', 1)

    // 验证初始余额
    const [before] = await db.select({ credits: users.credits }).from(users).where(eq(users.id, testUserId)).limit(1)
    expect(before!.credits).toBe(50)

    // 🔴 并发 100 次扣减 1（真实跑条件 UPDATE，不 mock）
    const results = await Promise.all(
      Array.from({ length: 100 }, () =>
        creditService.tryDeduct(testUserId, 1, 'mcp_call', '并发测试').catch(() => false),
      ),
    )
    const successCount = results.filter(Boolean).length
    expect(successCount).toBe(50)

    // 🔴 余额不为负
    const [after] = await db.select({ credits: users.credits }).from(users).where(eq(users.id, testUserId)).limit(1)
    expect(after!.credits).toBe(0)
    expect(after!.credits).toBeGreaterThanOrEqual(0)
  })

  it('余额不足时 tryDeduct 返回 false（不抛错）', async () => {
    const { creditService } = await import('@/modules/credit/credit.service')
    const { users } = await import('@/db/schema')
    await ctx.db.update(users).set({ credits: 0 }).where(eq(users.id, testUserId))

    const ok = await creditService.tryDeduct(testUserId, 1, 'mcp_call', '余额不足测试')
    expect(ok).toBe(false)

    const [row] = await ctx.db.select({ credits: users.credits }).from(users).where(eq(users.id, testUserId)).limit(1)
    expect(row!.credits).toBe(0)
  })

  it('charge 余额不足时抛 402 INSUFFICIENT_CREDITS', async () => {
    const { creditService } = await import('@/modules/credit/credit.service')
    const { users } = await import('@/db/schema')
    await ctx.db.update(users).set({ credits: 0 }).where(eq(users.id, testUserId))

    try {
      await creditService.charge(testUserId, 1, 'mcp_call', '402 测试')
      expect(true).toBe(false) // 不应到这
    } catch (e: unknown) {
      expect((e as { status: number }).status).toBe(402)
      expect((e as { code: string }).code).toBe('INSUFFICIENT_CREDITS')
    }
  })

  it('tokensToCredits 向上取整', async () => {
    const { creditService } = await import('@/modules/credit/credit.service')
    expect(creditService.tokensToCredits(3120)).toBe(4) // ceil(3120/1000)
    expect(creditService.tokensToCredits(1000)).toBe(1) // 正好
    expect(creditService.tokensToCredits(1)).toBe(1) // 最少 1
    expect(creditService.tokensToCredits(0)).toBe(0) // 零不扣
  })
})
