/**
 * 认证服务（详见 docs/design/04 §六）
 *
 * auth 模块不分 repository 层（doc 04 既定），service 直接用 db。
 * 依赖方向：routes → authService → db，service 不读 Hono Context。
 *
 * 安全要点：
 *   - login 的「用户不存在」与「密码错误」返回相同消息（防枚举）
 *   - register 不传 role/credits，走 DB 默认（user/0）
 *   - 任何返回都不含 passwordHash
 */
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { hashPassword, verifyPassword } from '@/lib/hash'
import { HttpError } from '@/lib/errors'
import { signToken } from '@/lib/jwt'
import type { LoginDTO, LoginResultDTO, RegisterDTO, UserDTO } from '@agentblog/shared'

/** 从 db 行剔除 passwordHash 等内部字段，映射成对外的 UserDTO */
function toUserDTO(user: typeof users.$inferSelect): UserDTO {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    credits: user.credits,
    avatarUrl: user.avatarUrl,
    status: user.status,
  }
}

export const authService = {
  /** 登录：校验账号密码 → 签发 token */
  async login(dto: LoginDTO): Promise<LoginResultDTO> {
    const [user] = await db.select().from(users).where(eq(users.username, dto.username)).limit(1)

    // 用户不存在与密码错误返回相同消息，防用户名枚举
    if (!user) {
      throw HttpError.unauthorized('用户名或密码错误')
    }

    const valid = await verifyPassword(dto.password, user.passwordHash)
    if (!valid) {
      throw HttpError.unauthorized('用户名或密码错误')
    }

    // 禁用账号在密码校验通过后才返回 403（不提前暴露账号是否存在）
    if (user.status === 'disabled') {
      throw HttpError.forbidden('账号已禁用')
    }

    const token = await signToken({ sub: user.id, role: user.role })
    return { token, user: toUserDTO(user) }
  },

  /** 自助注册：固定 role=user、credits=0，不接收 role/credits 字段 */
  async register(dto: RegisterDTO): Promise<UserDTO> {
    try {
      // 直接插入，依赖 DB UNIQUE 约束防重复，消除「先查后插」TOCTOU 竞态
      const [created] = await db
        .insert(users)
        .values({
          username: dto.username,
          passwordHash: await hashPassword(dto.password),
          // role/credits 不传，走 DB 默认（user / 0）
        })
        .returning()

      return toUserDTO(created!)
    } catch (e: unknown) {
      // SQLite UNIQUE 约束 → 409 用户名已存在（并发安全）
      if (e instanceof Error && 'code' in e && e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw HttpError.conflict('用户名已存在')
      }
      throw e
    }
  },

  /** 获取当前用户信息（/me 用） */
  async me(userId: number): Promise<UserDTO> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user) {
      throw HttpError.notFound('用户不存在')
    }
    return toUserDTO(user)
  },
}
