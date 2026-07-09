/**
 * 标签路由（详见 docs/design/06 §九）
 *
 * 挂载于 /api/tags（由 routes/index.ts 聚合）。
 *   - 公开：GET /（列出全部标签）
 *   - admin+：POST /（创建）、DELETE /:id（删除）
 *
 * requireRole 来自 #17（已合并进 main）。
 */
import { Hono } from 'hono'
import { createTagSchema, Role } from '@agentblog/shared'
import { ok } from '@/lib/response'
import { zodCheck } from '@/lib/zod-check'
import { authMiddleware } from '@/middlewares/auth'
import { requireRole } from '@/middlewares/rbac'
import { tagService } from '@/modules/tag/tag.service'

export const tagsRoutes = new Hono()

// ── 公开：列出全部标签 ──
tagsRoutes.get('/', async (c) => {
  return ok(c, await tagService.list())
})

// ── 以下需登录 ──
tagsRoutes.use('*', authMiddleware)

// 创建标签（admin+）
tagsRoutes.post('/', requireRole(Role.ADMIN, Role.SUPER_ADMIN), zodCheck('json', createTagSchema), async (c) => {
  const dto = c.req.valid('json')
  return ok(c, await tagService.create(dto), 201)
})

// 删除标签（admin+）
tagsRoutes.delete('/:id', requireRole(Role.ADMIN, Role.SUPER_ADMIN), async (c) => {
  await tagService.delete(Number(c.req.param('id')))
  return ok(c, { deleted: true })
})
