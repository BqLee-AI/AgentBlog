/**
 * Agent 服务（详见 docs/design/07 §1.3）
 *
 * 编排 Agent CRUD + 每用户 ≤1 约束 + 资源归属校验。
 * actor 形状复用 { id, role }（与 #17 一致）。
 *
 * 每用户 ≤1 双保险：service findByUserId 查存在性 + DB UNIQUE(user_id) 约束。
 */
import type { AgentDTO, Actor } from '@agentblog/shared'
import { HttpError } from '@/lib/errors'
import { agentRepository, type AgentRow } from './agent.repository'
import type { CreateAgentDTO, UpdateAgentDTO } from '@agentblog/shared'

/** 从 repository 行映射成对外 AgentDTO */
function toAgentDTO(agent: AgentRow): AgentDTO {
  return {
    id: agent.id,
    userId: agent.userId,
    name: agent.name,
    avatarUrl: agent.avatarUrl,
    systemPrompt: agent.systemPrompt,
    status: agent.status,
  }
}

/** actor 形状从 @agentblog/shared 引入（review should-fix-2 统一真相源） */

export const agentService = {
  /** 获取我的 Agent（0 或 1 个） */
  async getMine(userId: number): Promise<AgentDTO | null> {
    const agent = await agentRepository.findByUserId(userId)
    return agent ? toAgentDTO(agent) : null
  },

  /** 创建 Agent（每用户 ≤1） */
  async create(dto: CreateAgentDTO, userId: number): Promise<AgentDTO> {
    // 应用层校验：已有 → 409
    const existing = await agentRepository.findByUserId(userId)
    if (existing) {
      throw HttpError.conflict('每个用户只能创建 1 个 Agent')
    }

    try {
      // DB UNIQUE 兜底：并发双写时第二个 insert 触发约束
      const agent = await agentRepository.insert({
        userId,
        name: dto.name,
        avatarUrl: dto.avatarUrl,
        systemPrompt: dto.systemPrompt,
        status: dto.status,
      })
      return toAgentDTO(agent)
    } catch (e: unknown) {
      if (e instanceof Error && 'code' in e && e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw HttpError.conflict('每个用户只能创建 1 个 Agent')
      }
      throw e
    }
  },

  /** 更新 Agent（资源归属：主人或 admin+） */
  async update(agentId: number, dto: UpdateAgentDTO, actor: Actor): Promise<AgentDTO> {
    const agent = await agentRepository.findById(agentId)
    if (!agent) {
      throw HttpError.notFound('Agent 不存在')
    }

    // 资源归属：非主人且非 admin+ → 403
    if (agent.userId !== actor.id && actor.role === 'user') {
      throw HttpError.forbidden('无权操作他人 Agent')
    }

    const updated = await agentRepository.update(agentId, dto)
    if (!updated) {
      throw HttpError.notFound('Agent 不存在')
    }
    return toAgentDTO(updated)
  },

  /** 删除 Agent（级联删其 api_key，外键 cascade） */
  async remove(agentId: number, actor: Actor): Promise<void> {
    const agent = await agentRepository.findById(agentId)
    if (!agent) {
      throw HttpError.notFound('Agent 不存在')
    }

    if (agent.userId !== actor.id && actor.role === 'user') {
      throw HttpError.forbidden('无权删除他人 Agent')
    }

    await agentRepository.delete(agentId)
  },

  /**
   * 归属校验（供 apiKeyService.listByAgent 等只读操作复用）。
   * Agent 不存在 → 404；非主人且非 admin+ → 403。
   */
  async assertOwnership(agentId: number, actor: Actor): Promise<void> {
    const agent = await agentRepository.findById(agentId)
    if (!agent) {
      throw HttpError.notFound('Agent 不存在')
    }
    if (agent.userId !== actor.id && actor.role === 'user') {
      throw HttpError.forbidden('无权操作他人 Agent')
    }
  },
}
