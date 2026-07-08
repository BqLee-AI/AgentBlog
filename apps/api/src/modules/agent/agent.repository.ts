/**
 * Agent 数据层（详见 docs/design/02 §四 repository 职责）
 *
 * 纯 Drizzle 查询，不含业务规则。
 */
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { agents } from '@/db/schema'

export type AgentRow = typeof agents.$inferSelect

export const agentRepository = {
  /** 按 userId 查（每用户 ≤1，getMine 用） */
  async findByUserId(userId: number): Promise<AgentRow | null> {
    const [agent] = await db.select().from(agents).where(eq(agents.userId, userId)).limit(1)
    return agent ?? null
  },

  /** 按 id 查 */
  async findById(id: number): Promise<AgentRow | null> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id)).limit(1)
    return agent ?? null
  },

  /** 插入 */
  async insert(data: typeof agents.$inferInsert): Promise<AgentRow> {
    const [created] = await db.insert(agents).values(data).returning()
    return created!
  },

  /** 更新（补 updatedAt，schema 未配 $onUpdate） */
  async update(
    id: number,
    data: Record<string, unknown>,
  ): Promise<AgentRow | null> {
    const [updated] = await db
      .update(agents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(agents.id, id))
      .returning()
    return updated ?? null
  },

  /** 删除（外键 cascade 自动删其 api_key） */
  async delete(id: number): Promise<void> {
    await db.delete(agents).where(eq(agents.id, id))
  },
}
