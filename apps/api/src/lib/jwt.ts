/**
 * JWT 工具（详见 docs/design/04 §三）
 *
 * - 用 hono/jwt（公开稳定 API），不用 hono/utils/jwt/jws（内部路径）
 * - HS256 对称加密，单 access token，7d 过期，无 refresh token
 * - JWT_EXPIRES_IN 形如 "7d"/"2h"/"30m"/"3600"，sign 需要秒数，故先转换
 */
import { sign, verify } from 'hono/jwt'
import { env } from '@/config/env'
import { HttpError } from '@/lib/errors'

export interface JwtPayload {
  sub: number // user.id
  role: string // 'super_admin' | 'admin' | 'user'
  iat?: number
  exp?: number
}

/**
 * 把 "7d"/"2h"/"30m"/"45s"/"3600" 转成秒数。
 * hono/jwt 的 sign 只接受秒数（exp 字段），不解析 "7d" 字符串。
 */
function parseExpiryToSeconds(input: string): number {
  const m = /^(\d+)([smhd])?$/.exec(input.trim())
  if (!m) throw new Error(`JWT_EXPIRES_IN 格式非法: ${input}（示例: 7d / 2h / 3600）`)
  const n = Number(m[1])
  const unit = (m[2] ?? 's') as 's' | 'm' | 'h' | 'd'
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 } as const
  return n * multipliers[unit]
}

/** 签发 token：注入 exp（当前时间 + JWT_EXPIRES_IN 转秒） */
export async function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + parseExpiryToSeconds(env.JWT_EXPIRES_IN)
  return sign({ ...payload, exp }, env.JWT_SECRET, 'HS256')
}

/** 校验 token：失败统一抛 HttpError.unauthorized（不泄露 jwt 内部错误） */
export async function verifyToken(token: string): Promise<JwtPayload> {
  try {
    // hono/jwt 的 verify 返回其内部 JWTPayload 类型，转 unknown 再断言为本项目的 JwtPayload
    return (await verify(token, env.JWT_SECRET, 'HS256')) as unknown as JwtPayload
  } catch {
    throw HttpError.unauthorized('登录已过期，请重新登录')
  }
}
