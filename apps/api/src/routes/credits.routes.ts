/**
 * Credits 路由（详见 docs/design/08 §六）
 *
 * 挂载于 /api/credits（由 routes/index.ts 聚合）：
 *   POST /api/credits/recharge    —— admin+ 充值
 *   GET  /api/credits/me/logs     —— 任意登录查自己流水
 *   GET  /api/credits/logs/:userId —— admin+ 查任意用户流水
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { Role, paginationSchema } from '@agentblog/shared'
import { ok } from '@/lib/response'
import { zodCheck } from '@/lib/zod-check'
import { authMiddleware } from '@/middlewares/auth'
import { requireRole } from '@/middlewares/rbac'
import { creditService } from '@/modules/credit/credit.service'

export const creditsRoutes = new Hono()

// 先认证（JWT）
creditsRoutes.use('*', authMiddleware)

// admin+ 充值
const rechargeSchema = z.object({
  userId: z.number().int().positive(),
  amount: z.number().int().positive(),
  reason: z.string().default('手动充值'),
})

creditsRoutes.post(
  '/recharge',
  requireRole(Role.ADMIN, Role.SUPER_ADMIN),
  zodCheck('json', rechargeSchema),
  async (c) => {
    const { userId, amount, reason } = c.req.valid('json')
    await creditService.recharge(userId, amount, reason, c.var.user.id)
    return ok(c, { recharged: true })
  },
)

// 任意登录查自己流水
creditsRoutes.get('/me/logs', zodCheck('query', paginationSchema), async (c) => {
  const opts = c.req.valid('query')
  const result = await creditService.logs(c.var.user.id, opts.page, opts.pageSize)
  return ok(c, result)
})

// admin+ 查任意用户流水
creditsRoutes.get(
  '/logs/:userId',
  requireRole(Role.ADMIN, Role.SUPER_ADMIN),
  zodCheck('query', paginationSchema),
  async (c) => {
    const opts = c.req.valid('query')
    const userId = Number(c.req.param('userId'))
    const result = await creditService.logs(userId, opts.page, opts.pageSize)
    return ok(c, result)
  },
)
