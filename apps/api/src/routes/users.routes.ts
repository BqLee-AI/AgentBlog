/**
 * 用户管理路由（详见 docs/design/05 §七/§八）
 *
 * 挂载于 /api/users（由 routes/index.ts 聚合）：
 *   GET  /api/users           —— admin+ 列表
 *   PATCH /api/users/:id/role —— 仅 super_admin 改角色
 *   PATCH /api/users/:id/status —— admin+ 禁用/启用
 *
 * 鉴权双层：authMiddleware（先认证）+ requireRole（角色挡）+ service（归属/自我保护）。
 */
import { Hono } from 'hono'
import { Role } from '@agentblog/shared'
import { ok } from '@/lib/response'
import { zodCheck } from '@/lib/zod-check'
import { authMiddleware } from '@/middlewares/auth'
import { requireRole } from '@/middlewares/rbac'
import { userService } from '@/modules/user/user.service'
import { listUsersSchema, updateRoleSchema, updateStatusSchema } from '@/modules/user/user.schema'

export const usersRoutes = new Hono()

// 所有用户管理接口先认证
usersRoutes.use('*', authMiddleware)

// admin+ 用户列表
usersRoutes.get('/', requireRole(Role.ADMIN, Role.SUPER_ADMIN), zodCheck('query', listUsersSchema), async (c) => {
  const opts = c.req.valid('query')
  const result = await userService.list(opts, { id: c.var.user.id, role: c.var.user.role })
  return ok(c, result)
})

// 仅 super_admin 改角色（提权是超管专属，doc 05 §八）
usersRoutes.patch('/:id/role', requireRole(Role.SUPER_ADMIN), zodCheck('json', updateRoleSchema), async (c) => {
  const targetId = Number(c.req.param('id'))
  const dto = c.req.valid('json')
  const user = await userService.updateRole(targetId, dto.role, {
    id: c.var.user.id,
    role: c.var.user.role,
  })
  return ok(c, user)
})

// admin+ 禁用/启用
usersRoutes.patch('/:id/status', requireRole(Role.ADMIN, Role.SUPER_ADMIN), zodCheck('json', updateStatusSchema), async (c) => {
  const targetId = Number(c.req.param('id'))
  const dto = c.req.valid('json')
  const user = await userService.updateStatus(targetId, dto.status, {
    id: c.var.user.id,
    role: c.var.user.role,
  })
  return ok(c, user)
})
