/**
 * 认证中间件（详见 docs/design/04 §七/§八）
 *
 * 双鉴权分离红线：
 *   - 本中间件处理 JWT（人类用户，/api/* 用）
 *   - API Key（Agent，/mcp 用）由独立的 apiKeyMiddleware 处理（任务 15）
 *   - 两者不混用
 *
 * 每次请求实时查 DB 校验用户状态（catch 禁用/删除），不纯靠 token。
 */
import type { MiddlewareHandler } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { HttpError } from '@/lib/errors'
import { verifyToken } from '@/lib/jwt'

/** 注入到 c.var.user 的当前用户信息（精简字段，service 层按需再查） */
export interface AuthVars {
  user: {
    id: number
    username: string
    role: 'super_admin' | 'admin' | 'user'
    credits: number
  }
}

// Hono 类型增强：让 c.var.user 在 TS 里有类型
declare module 'hono' {
  interface ContextVariableMap {
    user: AuthVars['user']
  }
}

/** 解析 Bearer token → 校验 → 实时查用户 → 注入 c.var.user */
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    throw HttpError.unauthorized('未提供认证信息')
  }
  const token = header.slice(7)

  const payload = await verifyToken(token)

  // 实时查 DB：catch 禁用 / 删除账号（token 有效但用户已不可用）
  const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1)
  if (!user || user.status === 'disabled') {
    throw HttpError.unauthorized('账号不可用')
  }

  c.set('user', {
    id: user.id,
    username: user.username,
    role: user.role,
    credits: user.credits,
  })

  await next()
}

/**
 * 可选认证：登录态可选的接口用（如阅读页，登录了显示个性化、未登录也能看）。
 * 静默吞错，仅当用户 active 时才注入 c.var.user。
 */
export const maybeAuth: MiddlewareHandler = async (c, next) => {
  const header = c.req.header('Authorization')
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = await verifyToken(header.slice(7))
      const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1)
      if (user && user.status === 'active') {
        c.set('user', {
          id: user.id,
          username: user.username,
          role: user.role,
          credits: user.credits,
        })
      }
    } catch {
      // 静默吞错：maybeAuth 不因 token 无效而阻断请求
    }
  }
  await next()
}
