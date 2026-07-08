/**
 * Credits 并发安全测试（详见 docs/design/08 §八）
 *
 * 🔴 计费可信度唯一证明：
 *   余额 50 时并发 100 次扣减 1，断言成功数 = 50、无负数。
 *
 * 运行：bun test apps/api/tests/credit.concurrency.test.ts
 */
import { describe, it, expect, beforeAll } from 'bun:test'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { creditService } from '@/modules/credit/credit.service'

/** 测试用独立用户（测前注册，避免依赖 seed） */
const TEST_USER = { username: 'credit_test_user', password: 'pass1234' }
let testUserId: number

beforeAll(async () => {
  // 注册测试用户（如果已存在则复用）
  const { hashPassword } = await import('@/lib/hash')
  const [existing] = await db.select().from(users).where(eq(users.username, TEST_USER.username)).limit(1)
  if (existing) {
    testUserId = existing.id
  } else {
    const [created] = await db
      .insert(users)
      .values({
        username: TEST_USER.username,
        passwordHash: await hashPassword(TEST_USER.password),
      })
      .returning()
    testUserId = created!.id
  }
})

describe('credits 并发安全', () => {
  it('余额 50 时并发 100 次扣减，应只成功 50 次', async () => {
    // 准备：先充到 50（用事务内条件 UPDATE 重置到精确值）
    await db.update(users).set({ credits: 0 }).where(eq(users.id, testUserId))
    await creditService.recharge(testUserId, 50, '并发测试准备', 1)

    // 验证初始余额
    const [before] = await db.select({ credits: users.credits }).from(users).where(eq(users.id, testUserId)).limit(1)
    expect(before!.credits).toBe(50)

    // 并发 100 次扣减 1
    const results = await Promise.all(
      Array.from({ length: 100 }, () =>
        creditService.tryDeduct(testUserId, 1, 'mcp_call', '并发测试').catch(() => false),
      ),
    )

    const successCount = results.filter(Boolean).length
    expect(successCount).toBe(50)

    // 验证余额不为负
    const [after] = await db.select({ credits: users.credits }).from(users).where(eq(users.id, testUserId)).limit(1)
    expect(after!.credits).toBe(0)
    expect(after!.credits).toBeGreaterThanOrEqual(0)
  })

  it('余额不足时 tryDeduct 返回 false（不抛错）', async () => {
    // 重置到 0
    await db.update(users).set({ credits: 0 }).where(eq(users.id, testUserId))

    const ok = await creditService.tryDeduct(testUserId, 1, 'mcp_call', '余额不足测试')
    expect(ok).toBe(false)

    // 余额仍为 0，无负数
    const [row] = await db.select({ credits: users.credits }).from(users).where(eq(users.id, testUserId)).limit(1)
    expect(row!.credits).toBe(0)
  })

  it('charge 余额不足时抛 402', async () => {
    await db.update(users).set({ credits: 0 }).where(eq(users.id, testUserId))

    try {
      await creditService.charge(testUserId, 1, 'mcp_call', '402 测试')
      expect(true).toBe(false) // 不应到这
    } catch (e: unknown) {
      expect((e as { status: number }).status).toBe(402)
      expect((e as { code: string }).code).toBe('INSUFFICIENT_CREDITS')
    }
  })

  it('tokensToCredits 向上取整', () => {
    expect(creditService.tokensToCredits(3120)).toBe(4) // ceil(3120/1000)
    expect(creditService.tokensToCredits(1000)).toBe(1) // 正好
    expect(creditService.tokensToCredits(1)).toBe(1) // 最少 1
    expect(creditService.tokensToCredits(0)).toBe(0) // 零不扣
  })
})
