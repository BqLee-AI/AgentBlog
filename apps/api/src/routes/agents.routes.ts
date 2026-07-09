/**
 * Agent 管理路由（详见 docs/design/07 §1.4 + §2.4）
 *
 * 挂载于 /api/agents 和 /api/api-keys（由 routes/index.ts 聚合）：
 *   GET    /api/agents/me          —— 获取我的 Agent
 *   POST   /api/agents             —— 创建 Agent（每用户 ≤1）
 *   PATCH  /api/agents/:id         —— 更新 Agent（资源归属）
 *   DELETE /api/agents/:id         —— 删除 Agent（级联删 Key）
 *   GET    /api/agents/:id/api-keys —— 列出 Agent 的 Key（无明文）
 *   POST   /api/agents/:id/api-keys —— 签发 Key（🔴 明文仅返回一次）
 *
 * 资源归属：主人或 admin+（service 层校验）。
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { createAgentSchema, updateAgentSchema } from '@agentblog/shared'
import { ok } from '@/lib/response'
import { zodCheck } from '@/lib/zod-check'
import { authMiddleware } from '@/middlewares/auth'
import { agentService } from '@/modules/agent/agent.service'
import { apiKeyService } from '@/modules/api-key/api-key.service'

export const agentsRoutes = new Hono()

// 所有 Agent 管理接口先认证（JWT）
agentsRoutes.use('*', authMiddleware)

// 获取我的 Agent（0 或 1 个）
agentsRoutes.get('/me', async (c) => {
  const agent = await agentService.getMine(c.var.user.id)
  return ok(c, agent)
})

// 创建 Agent（每用户 ≤1）
agentsRoutes.post('/', zodCheck('json', createAgentSchema), async (c) => {
  const dto = c.req.valid('json')
  const agent = await agentService.create(dto, c.var.user.id)
  return ok(c, agent, 201)
})

// 更新 Agent（资源归属）
agentsRoutes.patch('/:id', zodCheck('json', updateAgentSchema), async (c) => {
  const agentId = Number(c.req.param('id'))
  const dto = c.req.valid('json')
  const agent = await agentService.update(agentId, dto, {
    id: c.var.user.id,
    role: c.var.user.role,
  })
  return ok(c, agent)
})

// 删除 Agent（级联删其 api_key）
agentsRoutes.delete('/:id', async (c) => {
  await agentService.remove(Number(c.req.param('id')), {
    id: c.var.user.id,
    role: c.var.user.role,
  })
  return ok(c, { deleted: true })
})

// 列出 Agent 的 API Key（🔴 无明文、无 keyHash）
agentsRoutes.get('/:id/api-keys', async (c) => {
  const agentId = Number(c.req.param('id'))
  const actor = { id: c.var.user.id, role: c.var.user.role }
  // 资源归属校验：非主人且非 admin+ → 403（复用 agentService 的归属检查）
  await agentService.assertOwnership(agentId, actor)
  const keys = await apiKeyService.listByAgent(agentId)
  return ok(c, keys)
})

// 签发 API Key（🔴 明文仅返回一次）
agentsRoutes.post(
  '/:id/api-keys',
  zodCheck('json', z.object({ name: z.string().max(50).optional() })),
  async (c) => {
    const agentId = Number(c.req.param('id'))
    const { name } = c.req.valid('json')
    const result = await apiKeyService.issue(agentId, name ?? null, {
      id: c.var.user.id,
      role: c.var.user.role,
    })
    return ok(c, result, 201)
  },
)
