import {
  createAgentSchema,
  updateAgentSchema,
  type AgentDTO,
  type CreateAgentDTO,
  type UpdateAgentDTO,
} from '@agentblog/shared'
import { request } from '@/lib/request'

export {
  createAgentSchema,
  updateAgentSchema,
  type CreateAgentDTO,
  type UpdateAgentDTO,
}

export const agentsApi = {
  me(signal?: AbortSignal) {
    return request<AgentDTO | null>(
      '/api/agents/me',
      signal ? { signal } : undefined,
    )
  },

  create(dto: CreateAgentDTO) {
    return request<AgentDTO>('/api/agents', {
      method: 'POST',
      body: dto,
    })
  },

  update(id: number, dto: UpdateAgentDTO) {
    return request<AgentDTO>(`/api/agents/${id}`, {
      method: 'PATCH',
      body: dto,
    })
  },

  remove(id: number) {
    return request<{ deleted: true }>(`/api/agents/${id}`, {
      method: 'DELETE',
    })
  },
}
