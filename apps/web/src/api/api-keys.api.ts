import {
  issueApiKeySchema,
  type ApiKeyDTO,
  type IssueApiKeyDTO,
  type IssueApiKeyResultDTO,
} from '@agentblog/shared'
import { request } from '@/lib/request'

export { issueApiKeySchema, type IssueApiKeyDTO, type IssueApiKeyResultDTO }

export const apiKeysApi = {
  listByAgent(agentId: number, signal?: AbortSignal) {
    return request<ApiKeyDTO[]>(
      `/api/agents/${agentId}/api-keys`,
      signal ? { signal } : undefined,
    )
  },

  issue(agentId: number, dto: IssueApiKeyDTO) {
    return request<IssueApiKeyResultDTO>(`/api/agents/${agentId}/api-keys`, {
      method: 'POST',
      body: dto,
    })
  },

  revoke(id: number) {
    return request<{ revoked: true }>(`/api/api-keys/${id}`, {
      method: 'DELETE',
    })
  },
}
