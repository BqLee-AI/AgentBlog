/**
 * API Key 管理路由（详见 docs/design/07 §2.4）
 *
 * 挂载于 /api/api-keys（由 routes/index.ts 聚合）：
 *   DELETE /api/api-keys/:id —— 吊销 Key（反查归属）
 *
 * 注意：签发和列出在 /api/agents/:id/api-keys 下（agents.routes.ts）。
 */
import { Hono } from 'hono'
import { ok } from '@/lib/response'
import { authMiddleware } from '@/middlewares/auth'
import { apiKeyService } from '@/modules/api-key/api-key.service'

export const apiKeysRoutes = new Hono()

// 先认证（JWT）
apiKeysRoutes.use('*', authMiddleware)

// 吊销 Key（反查 key→agent→user 归属，在 service 层校验）
apiKeysRoutes.delete('/:id', async (c) => {
  await apiKeyService.revoke(Number(c.req.param('id')), {
    id: c.var.user.id,
    role: c.var.user.role,
  })
  return ok(c, { revoked: true })
})
