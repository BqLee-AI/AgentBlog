/**
 * 用户数据层（详见 docs/design/02 §四 repository 职责）
 *
 * 纯 Drizzle 查询，不含业务规则。
 * 安全要点：所有查询显式 select，绝不返回 passwordHash 列。
 */
import { eq, sql, desc } from 'drizzle-orm'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import type { Role, UserStatus } from '@agentblog/shared'

/** 对外暴露的列（不含 passwordHash） */
const userColumns = {
  id: users.id,
  username: users.username,
  role: users.role,
  credits: users.credits,
  avatarUrl: users.avatarUrl,
  status: users.status,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
} as const

/** repository 返回的行类型（含时间戳，service 层按需映射成 UserDTO） */
export type UserRow = {
  id: number
  username: string
  role: Role
  credits: number
  avatarUrl: string | null
  status: UserStatus
  createdAt: Date
  updatedAt: Date
}

export const userRepository = {
  /** 分页列表（按 id 倒序，新用户在前） */
  async findMany(opts: { page: number; pageSize: number }): Promise<{ items: UserRow[]; total: number }> {
    const { page, pageSize } = opts
    const offset = (page - 1) * pageSize

    const [items, countResult] = await Promise.all([
      db.select(userColumns).from(users).orderBy(desc(users.id)).limit(pageSize).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(users),
    ])

    return { items, total: countResult[0]?.count ?? 0 }
  },

  /** 按 id 查单条（不含 passwordHash） */
  async findById(id: number): Promise<UserRow | null> {
    const [user] = await db.select(userColumns).from(users).where(eq(users.id, id)).limit(1)
    return user ?? null
  },

  /** 改角色（仅 role 字段，updatedAt 由 DB 触发器/默认处理） */
  async updateRole(id: number, role: Role): Promise<UserRow> {
    const [updated] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning(userColumns)
    return updated!
  },

  /** 改状态（启用/禁用） */
  async updateStatus(id: number, status: UserStatus): Promise<UserRow> {
    const [updated] = await db
      .update(users)
      .set({ status })
      .where(eq(users.id, id))
      .returning(userColumns)
    return updated!
  },
}
