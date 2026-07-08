/**
 * Agent 模块 Zod schema（详见 docs/design/07 §1.2）
 *
 * 仅后端消费（前端 Agent 管理页 #10 还没做），放 api 本地。
 *
 * 注意：本项目用 Zod 4，错误消息用 { error: '...' } 形式。
 */
import { z } from 'zod'
import { AgentStatus } from '@agentblog/shared'

/** 创建 Agent */
export const createAgentSchema = z.object({
  name: z.string().min(1, { error: '名称不能为空' }).max(50),
  avatarUrl: z.string().url().optional(),
  systemPrompt: z.string().max(8000).optional(),
  status: z.enum([AgentStatus.ACTIVE, AgentStatus.DISABLED]).default(AgentStatus.ACTIVE),
})
export type CreateAgentDTO = z.infer<typeof createAgentSchema>

/** 更新 Agent（所有字段可选） */
export const updateAgentSchema = createAgentSchema.partial()
export type UpdateAgentDTO = z.infer<typeof updateAgentSchema>
