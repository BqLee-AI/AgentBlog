/**
 * 认证路由（详见 docs/design/04 §九）
 *
 * 挂载于 /api/auth（由 routes/index.ts 聚合）：
 *   POST /api/auth/register  —— 公开，自助注册（不挂 authMiddleware）
 *   POST /api/auth/login     —— 公开，登录
 *   GET  /api/auth/me        —— 需登录（authMiddleware）
 *
 * route 不 try/catch 业务错误，统一由 app.onError 兜底。
 */
import { Hono } from 'hono'
import { ok } from '@/lib/response'
import { zodCheck } from '@/lib/zod-check'
import { authMiddleware } from '@/middlewares/auth'
import { authService } from '@/modules/auth/auth.service'
import { loginSchema, registerSchema } from '@/modules/auth/auth.schema'

export const auth = new Hono()

// 公开：自助注册（role 固定 user，不接收 role/credits）
auth.post('/register', zodCheck('json', registerSchema), async (c) => {
  const dto = c.req.valid('json')
  const user = await authService.register(dto)
  return ok(c, user, 201)
})

// 公开：登录
auth.post('/login', zodCheck('json', loginSchema), async (c) => {
  const dto = c.req.valid('json')
  const result = await authService.login(dto)
  return ok(c, result)
})

// 需登录：获取当前用户
auth.get('/me', authMiddleware, async (c) => {
  const user = await authService.me(c.var.user.id)
  return ok(c, user)
})
