/**
 * Credits 计费服务（详见 docs/design/08）
 *
 * 🔴 原子扣减红线（需求 §4.5）：
 *   tryDeduct 用单条条件 UPDATE（WHERE credits >= amount）在事务内，
 *   绝不拆成 select-then-update。SQLite UPDATE 语句级原子 + WAL 序列化写入。
 *
 * CreditType 对齐 db schema（recharge/mcp_call/agent_token），
 * 不用 doc 08 旧的 spend_mcp/spend_token。
 *
 * creditService 不读 Hono Context（供 MCP / AI 嵌入）；
 * charge 抛 HttpError.payment() 由 errorHandler 转 402。
 */
import { eq, and, gte, sql, desc } from 'drizzle-orm'
import { db } from '@/db/client'
import { users, creditLogs } from '@/db/schema'
import { env } from '@/config/env'
import { HttpError } from '@/lib/errors'
import type { CreditLogDTO, CreditLogType, PaginatedDTO } from '@agentblog/shared'

/** 计费类型（对齐 db schema 的 credit_log.type 枚举） */
export type CreditType = CreditLogType

export const creditService = {
  /**
   * 原子扣减。返回是否成功。
   * - amount ≤ 0 → true（防零扣减）
   * - 🔴 条件 UPDATE（WHERE credits >= amount）在事务内，影响 0 行=false，1 行=true+写流水
   */
  async tryDeduct(
    userId: number,
    amount: number,
    type: CreditType,
    reason: string,
  ): Promise<boolean> {
    if (amount <= 0) return true

    return db.transaction(async (tx) => {
      // 🔴 关键：条件 UPDATE，行级原子。只有 credits >= amount 才更新
      const updated = await tx
        .update(users)
        .set({ credits: sql`${users.credits} - ${amount}` })
        .where(and(eq(users.id, userId), gte(users.credits, amount)))
        .returning({ id: users.id })

      if (updated.length === 0) return false // 余额不足

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

  /**
   * 扣减，余额不足直接抛 402（调用方常用）。
   * 供 MCP 工具成功后（#21）、在线 Agent onFinish（#22）调用。
   */
  async charge(
    userId: number,
    amount: number,
    type: CreditType,
    reason: string,
  ): Promise<void> {
    const ok = await this.tryDeduct(userId, amount, type, reason)
    if (!ok) {
      throw HttpError.payment('额度不足，请联系管理员充值')
    }
  },

  /** 管理员充值（事务：UPDATE +amount + 写流水） */
  async recharge(userId: number, amount: number, reason: string, actorId: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ credits: sql`${users.credits} + ${amount}` })
        .where(eq(users.id, userId))

      await tx.insert(creditLogs).values({
        userId,
        delta: amount,
        type: 'recharge',
        reason: `${reason}（操作人 #${actorId}）`,
      })
    })
  },

  /** 查流水（按 createdAt desc 分页） */
  async logs(userId: number, page: number, pageSize: number): Promise<PaginatedDTO<CreditLogDTO>> {
    const offset = (page - 1) * pageSize

    const [items, countResult] = await Promise.all([
      db
        .select({
          id: creditLogs.id,
          userId: creditLogs.userId,
          delta: creditLogs.delta,
          type: creditLogs.type,
          reason: creditLogs.reason,
          createdAt: creditLogs.createdAt,
        })
        .from(creditLogs)
        .where(eq(creditLogs.userId, userId))
        .orderBy(desc(creditLogs.createdAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(creditLogs).where(eq(creditLogs.userId, userId)),
    ])

    return {
      items: items.map((row) => ({
        ...row,
        type: row.type as CreditLogType,
        createdAt: row.createdAt.toISOString(),
      })),
      total: countResult[0]?.count ?? 0,
      page,
      pageSize,
    }
  },

  /** 计算 token → credits 换算（向上取整防漏扣） */
  tokensToCredits(totalTokens: number): number {
    return Math.ceil(totalTokens / env.TOKENS_PER_CREDIT)
  },
}
