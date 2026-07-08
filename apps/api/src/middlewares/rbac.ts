/**
 * RBAC 角色中间件（详见 docs/design/05 §三）
 *
 * requireRole 是粗粒度角色级校验（05 §2.1 第一层）。
 * 细粒度资源归属校验在 service 层做（05 §2.1 第二层）。
 *
 * ⚠️ 必须挂在 authMiddleware 之后：requireRole 依赖 c.var.user。
 * 不查 DB——角色已在 JWT payload 中，由 authMiddleware 注入。
 */
import type { MiddlewareHandler } from 'hono'
import type { Role } from '@agentblog/shared'
import { HttpError } from '@/lib/errors'

/**
 * 要求当前用户角色在白名单内。
 * @example requireRole(Role.ADMIN, Role.SUPER_ADMIN)
 */
export function requireRole(...roles: Role[]): MiddlewareHandler {
  return async (c, next) => {
    const user = c.get('user')
    // 防御性：authMiddleware 未挂（理论不应到这）
    if (!user) {
      throw HttpError.unauthorized('未登录')
    }
    if (!roles.includes(user.role)) {
      throw HttpError.forbidden('无权执行此操作')
    }
    await next()
  }
}
